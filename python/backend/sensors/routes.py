from datetime import datetime, timezone

from pathlib import Path

from fastapi import APIRouter, HTTPException, status, Query, UploadFile, File
from pydantic import BaseModel, Field

from backend.database import (
    sensor_products_collection,
    units_collection,
    sensor_readings_collection,
    user_data_collection
)

from inference.predict import identify_crop_stage

CAMERA_IMAGE_DIR = Path("backend/storage/camera")
CAMERA_IMAGE_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(
    prefix="/api/v1",
    tags=["Sensors"]
)


# --------------------------------------------------
# Sensor Products
# --------------------------------------------------

class SensorProductCreate(BaseModel):
    product_id: str
    name: str
    description: str | None = None
    capabilities: list[str] = Field(default_factory=list)


@router.post(
    "/sensor-products",
    status_code=status.HTTP_201_CREATED
)
def create_sensor_product(data: SensorProductCreate):

    if sensor_products_collection.find_one({
        "_id": data.product_id
    }):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sensor product already exists"
        )

    product = {
        "_id": data.product_id,
        "name": data.name,
        "description": data.description,
        "capabilities": data.capabilities
    }

    sensor_products_collection.insert_one(product)

    return {
        "message": "Sensor product created successfully",
        "product_id": data.product_id
    }


@router.get("/sensor-products")
def get_sensor_products():

    products = list(
        sensor_products_collection.find({})
    )

    for product in products:
        product["product_id"] = product.pop("_id")

    return {
        "sensor_products": products
    }


@router.get("/sensor-products/{product_id}")
def get_sensor_product(product_id: str):

    product = sensor_products_collection.find_one({
        "_id": product_id
    })

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sensor product not found"
        )

    product["product_id"] = product.pop("_id")

    return product


# --------------------------------------------------
# Units
# --------------------------------------------------

class UnitCreate(BaseModel):
    unit_id: str
    product_id: str


@router.post(
    "/units",
    status_code=status.HTTP_201_CREATED
)
def create_unit(data: UnitCreate):

    # Make sure the product exists
    product = sensor_products_collection.find_one({
        "_id": data.product_id
    })

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sensor product not found"
        )

    # Make sure this physical unit doesn't already exist
    if units_collection.find_one({
        "_id": data.unit_id
    }):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unit already exists"
        )

    unit = {
        "_id": data.unit_id,
        "product_id": data.product_id,
        "status": "unassigned",
        "latest_reading": None,
        "created_at": datetime.now(timezone.utc)
    }

    units_collection.insert_one(unit)

    return {
        "message": "Unit created successfully",
        "unit_id": data.unit_id
    }


@router.get("/units")
def get_units():

    units = list(
        units_collection.find({})
    )

    for unit in units:
        unit["unit_id"] = unit.pop("_id")

    return {
        "units": units
    }


@router.get("/units/{unit_id}")
def get_unit(unit_id: str):

    unit = units_collection.find_one({
        "_id": unit_id
    })

    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found"
        )

    unit["unit_id"] = unit.pop("_id")

    return unit


# --------------------------------------------------
# Sensor Readings
# --------------------------------------------------

class SensorReadingCreate(BaseModel):
    unit_id: str
    readings: dict


@router.post(
    "/sensor-readings",
    status_code=status.HTTP_201_CREATED
)
def create_sensor_reading(data: SensorReadingCreate):

    # Make sure the unit exists
    unit = units_collection.find_one({
        "_id": data.unit_id
    })

    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found"
        )

    timestamp = datetime.now(timezone.utc)

    # 1. Store historical reading
    sensor_readings_collection.insert_one({
        "unit_id": data.unit_id,
        "timestamp": timestamp,
        "readings": data.readings
    })

    # 2. Update latest reading
    units_collection.update_one(
        {"_id": data.unit_id},
        {
            "$set": {
                "latest_reading": {
                    **data.readings,
                    "timestamp": timestamp
                }
            }
        }
    )

    return {
        "message": "Sensor reading recorded successfully",
        "unit_id": data.unit_id,
        "timestamp": timestamp
    }


@router.get("/sensor-readings/{unit_id}")
def get_sensor_readings(
    unit_id: str,
    limit: int = Query(
        default=20,
        ge=1,
        le=1000
    )
):

    # Make sure the unit exists
    unit = units_collection.find_one({
        "_id": unit_id
    })

    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found"
        )

    readings = list(
        sensor_readings_collection
        .find(
            {"unit_id": unit_id},
            {"_id": 0}
        )
        .sort("timestamp", -1)
        .limit(limit)
    )

    return {
        "unit_id": unit_id,
        "readings": readings
    }

# --------------------------------------------------
# Camera
# --------------------------------------------------

@router.post(
    "/camera/{unit_id}/image",
    status_code=status.HTTP_201_CREATED
)
async def upload_camera_image(
    unit_id: str,
    image: UploadFile = File(...)
):

    # --------------------------------------------------
    # 1. Make sure the unit exists
    # --------------------------------------------------

    unit = units_collection.find_one({
        "_id": unit_id
    })

    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found"
        )

    # --------------------------------------------------
    # 2. Make sure this unit is a camera
    # --------------------------------------------------

    product = sensor_products_collection.find_one({
        "_id": unit["product_id"]
    })

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sensor product not found"
        )

    if "camera" not in product.get("capabilities", []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unit is not a camera"
        )

    # --------------------------------------------------
    # 3. Find the farm containing this unit
    # --------------------------------------------------

    user_data = user_data_collection.find_one({
        "farms.units": unit_id
    })

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Camera unit is not assigned to any farm"
        )

    farm = next(
        (
            farm for farm in user_data.get("farms", [])
            if unit_id in farm.get("units", [])
        ),
        None
    )

    if not farm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Camera unit is not assigned to any farm"
        )

    farm_id = farm["farm_id"]
    crop = farm["crop"]

    # --------------------------------------------------
    # 4. Validate crop
    # --------------------------------------------------

    if crop not in {"wheat"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No crop-stage model available for crop: {crop}"
        )

    # --------------------------------------------------
    # 5. Save latest image
    # --------------------------------------------------

    image_path = CAMERA_IMAGE_DIR / f"{unit_id}.jpg"

    image_bytes = await image.read()

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty image"
        )

    image_path.write_bytes(image_bytes)

    # --------------------------------------------------
    # 6. Run crop-stage inference
    # --------------------------------------------------

    growth_stage, confidence = identify_crop_stage(
        str(image_path)
    )

    # --------------------------------------------------
    # 7. Update crop stage in farm
    # --------------------------------------------------

    crop_stage = {
        "stage": growth_stage,
        "confidence": confidence,
        "observed_at": datetime.now(timezone.utc)
    }

    result = user_data_collection.update_one(
        {
            "_id": user_data["_id"],
            "farms": {
                "$elemMatch": {
                    "farm_id": farm_id,
                    "units": unit_id
                }
            }
        },
        {
            "$set": {
                "farms.$.crop_stage": crop_stage
            }
        }
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update farm crop stage"
        )

    # --------------------------------------------------
    # 8. Save latest image information for the unit
    # --------------------------------------------------

    units_collection.update_one(
        {"_id": unit_id},
        {
            "$set": {
                "latest_image": {
                    "path": str(image_path),
                    "timestamp": datetime.now(timezone.utc)
                }
            }
        }
    )

    return {
        "message": "Camera image processed successfully",
        "unit_id": unit_id,
        "farm_id": farm_id,
        "crop": crop,
        "crop_stage": growth_stage,
        "confidence": confidence
    }