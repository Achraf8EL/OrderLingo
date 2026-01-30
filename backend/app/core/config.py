from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    environment: str = "development"

    # Database
    database_url: str = "postgresql+asyncpg://orderlingo:orderlingo_secret@localhost:5432/orderlingo"

    # Keycloak
    keycloak_issuer: str = "http://localhost:8081/realms/food"
    keycloak_audience: str = "food-api"
    keycloak_jwks_uri: str = "http://localhost:8081/realms/food/protocol/openid-connect/certs"
    keycloak_admin_url: str = "http://localhost:8081"  # For Keycloak Admin API (overridden in Docker)

    # Redis
    redis_url: str = "redis://localhost:6379/0"


settings = Settings()
