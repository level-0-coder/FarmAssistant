from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from backend.database import users_collection
from backend.auth.security import (
    hash_password,
    verify_password,
    create_access_token
)

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"]
)


class RegisterRequest(BaseModel):
    # name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest):

    existing_user = users_collection.find_one({
        "email": data.email
    })

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    user = {
        # "name": data.name,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "auth_provider": "local"
    }

    result = users_collection.insert_one(user)

    return {
        "message": "Registration successful",
        "user_id": str(result.inserted_id)
    }


@router.post("/login")
def login(data: LoginRequest):

    user = users_collection.find_one({
        "email": data.email
    })

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(
        data.password,
        user["password_hash"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token(str(user["_id"]))

    return {
        "access_token": token,
        "token_type": "bearer"
    }