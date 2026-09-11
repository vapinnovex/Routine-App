from pydantic import EmailStr, Field, field_validator

from app.schemas.data import Model, Profile, Title


class Login(Model):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value):
        return str(value).lower()


class Registration(Login):
    name: Title
    password: str = Field(min_length=10, max_length=128)


class AuthResponse(Model):
    accessToken: str
    tokenType: str = "bearer"
    expiresAt: str
    user: Profile
