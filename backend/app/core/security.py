from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt
from pydantic import BaseModel

from app.core.config import settings

http_bearer = HTTPBearer(auto_error=False)


class JWKSCache:
    """In-memory JWKS cache. Refresh on decode failure (e.g. key rotation)."""

    _keys: dict | None = None

    @classmethod
    async def get_keys(cls) -> dict:
        if cls._keys is not None:
            return cls._keys
        async with httpx.AsyncClient() as client:
            r = await client.get(settings.keycloak_jwks_uri)
            r.raise_for_status()
            cls._keys = r.json()
        return cls._keys

    @classmethod
    def invalidate(cls) -> None:
        cls._keys = None


class TokenPayload(BaseModel):
    sub: str
    realm_access: dict | None = None
    resource_access: dict | None = None
    scope: str | None = None
    preferred_username: str | None = None
    email: str | None = None


def _roles_from_token(payload: dict) -> list[str]:
    roles: list[str] = []
    # Realm-level roles
    ra = payload.get("realm_access") or {}
    roles.extend((ra.get("roles") or []))
    # Client-level roles (e.g. food-api)
    res = payload.get("resource_access") or {}
    for client, data in res.items():
        if isinstance(data, dict) and "roles" in data:
            roles.extend(data["roles"])
    return roles


async def _decode_token(token: str) -> TokenPayload:
    try:
        keys = await JWKSCache.get_keys()
    except Exception as e:
        JWKSCache.invalidate()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth provider unavailable",
        ) from e

    try:
        unverified = jwt.get_unverified_header(token)
        kid = unverified.get("kid")
        algo = unverified.get("alg", "RS256")
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from e

    jwk_dict = None
    for k in keys.get("keys", []):
        if k.get("kid") == kid:
            jwk_dict = k
            break
    if not jwk_dict:
        JWKSCache.invalidate()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unknown signing key",
        )
    key = jwk.construct(jwk_dict)

    options = {"verify_aud": True, "verify_exp": True}
    audience = settings.keycloak_audience
    if settings.environment == "development":
        options = {"verify_aud": False, "verify_exp": False}
        audience = None

    try:
        payload = jwt.decode(
            token,
            key,
            algorithms=[algo],
            audience=audience,
            options=options,
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
        ) from e

    issuer = payload.get("iss")
    expected_issuer = settings.keycloak_issuer.rstrip("/")
    actual_issuer = (issuer or "").rstrip("/")
    if actual_issuer and actual_issuer != expected_issuer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid issuer (expected {expected_issuer!r}, got {actual_issuer!r})",
        )

    return TokenPayload(
        sub=payload.get("sub", ""),
        realm_access=payload.get("realm_access"),
        resource_access=payload.get("resource_access"),
        scope=payload.get("scope"),
        preferred_username=payload.get("preferred_username"),
        email=payload.get("email"),
    )


class CurrentUser(BaseModel):
    sub: str
    preferred_username: str | None
    email: str | None
    roles: list[str]


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(http_bearer)],
) -> CurrentUser:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = await _decode_token(credentials.credentials)
    roles = _roles_from_token(
        {
            "realm_access": payload.realm_access,
            "resource_access": payload.resource_access,
        }
    )
    return CurrentUser(
        sub=payload.sub,
        preferred_username=payload.preferred_username,
        email=payload.email,
        roles=roles,
    )


def require_roles(*allowed: str):
    """Dependency factory: user must have at least one of `allowed` roles."""

    async def _check(
        user: Annotated[CurrentUser, Depends(get_current_user)],
    ) -> CurrentUser:
        if not allowed:
            return user
        if any(r in user.roles for r in allowed):
            return user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    return _check


RequirePlatformAdmin = require_roles("platform_admin")
RequireManager = require_roles("platform_admin", "restaurant_manager")
RequireStaff = require_roles("platform_admin", "restaurant_manager", "staff")
