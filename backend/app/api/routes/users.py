from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import CurrentUser, RequirePlatformAdmin, get_current_user

router = APIRouter(prefix="/users", tags=["users"])


class KeycloakUser(BaseModel):
    id: str
    username: str
    email: str | None = None
    firstName: str | None = None
    lastName: str | None = None
    enabled: bool


@router.get("", response_model=list[KeycloakUser])
async def list_keycloak_users(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    role: str | None = None,
) -> list[KeycloakUser]:
    """
    List all users from Keycloak realm 'food' (admin or manager).
    Optionally filter by role (restaurant_manager or staff).
    Uses Keycloak Admin REST API.
    """
    # Only platform_admin and restaurant_manager can list users
    if "platform_admin" not in user.roles and "restaurant_manager" not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform_admin or restaurant_manager can list users"
        )

    keycloak_url = settings.keycloak_admin_url
    realm = "food"
    
    try:
        token_url = f"{keycloak_url}/realms/master/protocol/openid-connect/token"
        token_data = {
            "grant_type": "password",
            "client_id": "admin-cli",
            "username": "admin",
            "password": "admin",
        }
        
        async with httpx.AsyncClient() as client:
            token_resp = await client.post(token_url, data=token_data)
            token_resp.raise_for_status()
            admin_token = token_resp.json()["access_token"]
            
            # Get users from realm 'food'
            users_url = f"{keycloak_url}/admin/realms/{realm}/users"
            users_resp = await client.get(
                users_url,
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            users_resp.raise_for_status()
            users_data = users_resp.json()
            
            # If role filter is specified, filter users by role
            if role:
                filtered_users = []
                for u in users_data:
                    # Get user's realm roles
                    user_roles_url = f"{keycloak_url}/admin/realms/{realm}/users/{u['id']}/role-mappings/realm"
                    roles_resp = await client.get(
                        user_roles_url,
                        headers={"Authorization": f"Bearer {admin_token}"},
                    )
                    if roles_resp.status_code == 200:
                        user_roles = roles_resp.json()
                        role_names = [r["name"] for r in user_roles]
                        if role in role_names:
                            filtered_users.append(u)
                users_data = filtered_users
            
            return [
                KeycloakUser(
                    id=u["id"],
                    username=u.get("username", ""),
                    email=u.get("email"),
                    firstName=u.get("firstName"),
                    lastName=u.get("lastName"),
                    enabled=u.get("enabled", False),
                )
                for u in users_data
            ]
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch users from Keycloak: {str(e)}",
        ) from e
