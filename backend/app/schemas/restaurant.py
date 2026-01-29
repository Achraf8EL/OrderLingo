import re
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


def _slug(v: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", v.lower()).strip("-")
    if not s:
        raise ValueError("slug invalide")
    return s


class RestaurantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str | None = None
    description: str | None = Field(None, max_length=1024)
    is_active: bool = True


class RestaurantCreate(RestaurantBase):
    @model_validator(mode="after")
    def slug_from_name(self):
        if self.slug is not None and self.slug != "":
            self.slug = _slug(self.slug)
        else:
            self.slug = _slug(self.name)
        return self


class RestaurantUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    slug: str | None = None
    description: str | None = Field(None, max_length=1024)
    is_active: bool | None = None
    manager_user_ids: list[str] | None = None

    @model_validator(mode="after")
    def normalize_slug(self):
        if self.slug is not None and self.slug != "":
            self.slug = _slug(self.slug)
        elif self.slug == "":
            self.slug = None
        return self


class RestaurantRead(RestaurantBase):
    id: UUID
    slug: str

    model_config = {"from_attributes": True}


class RestaurantUserRead(BaseModel):
    user_id: str
    role: str

    model_config = {"from_attributes": True}
