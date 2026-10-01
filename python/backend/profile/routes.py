from bson import ObjectId

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from backend.auth.security import get_current_user_id
from backend.database import user_data_collection


router = APIRouter(
    prefix="/api/v1/profile",
    tags=["Profile"]
)


class LocationData(BaseModel):
    state: str | None = None
    district: str | None = None
    village: str | None = None
    pincode: str | None = None


class FarmingData(BaseModel):
    experience_years: int | None = None
    farmer_type: str | None = None
    farming_type: str | None = None
    total_area: float | None = None
    area_unit: str | None = None


class PreferencesData(BaseModel):
    language: str | None = None
    notification: str | None = None


class ProfileCreateRequest(BaseModel):
    name: str
    age: int | None = None
    gender: str | None = None
    phone: str | None = None

    location: LocationData | None = None
    farming: FarmingData | None = None
    preferences: PreferencesData | None = None


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    age: int | None = None
    gender: str | None = None
    phone: str | None = None

    location: LocationData | None = None
    farming: FarmingData | None = None
    preferences: PreferencesData | None = None


@router.post("", status_code=status.HTTP_201_CREATED)
def create_profile(
    data: ProfileCreateRequest,
    user_id: str = Depends(get_current_user_id)
):
    existing_profile = user_data_collection.find_one({
        "user_id": ObjectId(user_id)
    })

    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Profile already exists"
        )

    profile = {
        "user_id": ObjectId(user_id),

        "profile": {
            "name": data.name,
            "age": data.age,
            "gender": data.gender,
            "phone": data.phone,

            "location": (
                data.location.model_dump(exclude_none=True)
                if data.location else {}
            ),

            "farming": (
                data.farming.model_dump(exclude_none=True)
                if data.farming else {}
            ),

            "preferences": (
                data.preferences.model_dump(exclude_none=True)
                if data.preferences else {}
            )
        },

        "farms": []
    }

    user_data_collection.insert_one(profile)

    return {
        "message": "Profile created successfully"
    }


@router.get("")
def get_profile(
    user_id: str = Depends(get_current_user_id)
):
    user_data = user_data_collection.find_one({
        "user_id": ObjectId(user_id)
    })

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    return {
        "profile": user_data.get("profile", {}),
        "farms": user_data.get("farms", [])
    }



@router.patch("")
def update_profile(
    data: ProfileUpdateRequest,
    user_id: str = Depends(get_current_user_id)
):
    update_data = data.model_dump(exclude_none=True)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )

    # Handle nested profile fields
    for field, value in update_data.items():

        if field in ["location", "farming", "preferences"]:
            value = value

        user_data_collection.update_one(
            {"user_id": ObjectId(user_id)},
            {
                "$set": {
                    f"profile.{field}": value
                }
            }
        )

    return {
        "message": "Profile updated successfully"
    }