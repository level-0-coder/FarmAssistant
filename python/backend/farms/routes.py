from uuid import uuid4

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from backend.auth.security import get_current_user_id
from backend.database import (
    units_collection,
    user_data_collection,
    analytics_data_collection
)

from inference.soil_grids import get_soil_moisture
from inference.predict_water import predict_depletion, predict_depletion_linear, predict_water_capacity
router = APIRouter(
    prefix="/api/v1/farms",
    tags=["Farms"]
)
from inference.open_meteo import get_forecast
from inference.simulation import predict_best_irrigation_window
from backend.scheduler import convert_area_to_m2

class LocationData(BaseModel):
    latitude: float
    longitude: float


class SoilData(BaseModel):
    type: str | None = None
    ph: float | None = None
    theta_fc: float | None = None
    theta_wp: float | None = None

class SolarPowerData(BaseModel):
    type: str = "solar"
    solar_capacity: float
    panel_tilt: float | None = None
    panel_direction: float | None = None # panel_azimuth

class PumpData(BaseModel):
    rated_power_hp: float
    rated_flow_lpm: float | None = None
    rated_head_m: float | None = None

class FarmCreateRequest(BaseModel):
    name: str
    crop: str
    area: float
    area_unit: str

    location: LocationData

    water_source: str
    power_source: SolarPowerData
    pump: PumpData

    soil: SoilData | None = None

    irrigation_method: str | None = None


@router.post("", status_code=status.HTTP_201_CREATED)
def add_farm(
    data: FarmCreateRequest,
    user_id: str = Depends(get_current_user_id)
):
    farm_id = f"farm_{uuid4().hex[:8]}"

    # # Fetch soil hydraulic properties using farm coordinates
    # try:
    #     soil_moisture = get_soil_moisture(
    #         latitude=data.location.latitude,
    #         longitude=data.location.longitude
    #     )
    # except Exception as e:
    #     raise HTTPException(
    #         status_code=status.HTTP_502_BAD_GATEWAY,
    #         detail=f"Failed to fetch soil data: {str(e)}"
    #     )

    # Start with user-provided soil information
    soil = (
        data.soil.model_dump(exclude_none=True)
        if data.soil
        else {}
    )

    # # Add SoilGrids values
    # soil["theta_fc"] = soil_moisture["theta_fc"]
    # soil["theta_wp"] = soil_moisture["theta_wp"]


    farm = {
        "farm_id": farm_id,
        "name": data.name,
        "crop": data.crop,
        "area": data.area,
        "area_unit": data.area_unit,

        "location": data.location.model_dump(),

        "water_source": data.water_source,
        "power_source": data.power_source.model_dump(),
        "pump": data.pump.model_dump(),

        "soil": soil,

        "irrigation_method": data.irrigation_method,

        "units": []
    }

    result = user_data_collection.update_one(
        {
            "user_id": ObjectId(user_id)
        },
        {
            "$push": {
                "farms": farm
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    return {
        "message": "Farm added successfully",
        "farm_id": farm_id
    }

class AssignUnitsRequest(BaseModel):
    unit_ids: list[str] = Field(min_length=1)

@router.post("/{farm_id}/units")
def assign_units(
    farm_id: str,
    data: AssignUnitsRequest,
    user_id: str = Depends(get_current_user_id)
):
    user_object_id = ObjectId(user_id)

    # 1. Check that the farm belongs to the current user
    user_data = user_data_collection.find_one({
        "user_id": user_object_id,
        "farms.farm_id": farm_id
    })

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found"
        )

    # 2. Check that all units exist
    units = list(
        units_collection.find({
            "_id": {
                "$in": data.unit_ids
            }
        })
    )

    existing_unit_ids = {
        unit["_id"]
        for unit in units
    }

    missing_unit_ids = [
        unit_id
        for unit_id in data.unit_ids
        if unit_id not in existing_unit_ids
    ]

    if missing_unit_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "One or more units not found",
                "unit_ids": missing_unit_ids
            }
        )

    # 3. Remove the units from every farm of this user
    user_data_collection.update_one(
        {
            "user_id": user_object_id
        },
        {
            "$pull": {
                "farms.$[].units": {
                    "$in": data.unit_ids
                }
            }
        }
    )

    # 4. Add the units to the selected farm
    user_data_collection.update_one(
        {
            "user_id": user_object_id,
            "farms.farm_id": farm_id
        },
        {
            "$addToSet": {
                "farms.$.units": {
                    "$each": data.unit_ids
                }
            }
        }
    )

    return {
        "message": "Units assigned successfully",
        "farm_id": farm_id,
        "unit_ids": data.unit_ids
    }



@router.post("/{farm_id}/irrigate")
def irrigate_farm(
    farm_id: str,
    user_id: str = Depends(get_current_user_id)
):
    user_object_id = ObjectId(user_id)
    timestamp = datetime.now(timezone.utc)

    result = user_data_collection.update_one(
        {
            "user_id": user_object_id,
            "farms.farm_id": farm_id
        },
        {
            "$push": {
                "farms.$.irrigation_history": timestamp
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Farm not found"
        )

    return {
        "message": "Irrigation recorded successfully",
        "farm_id": farm_id,
        "irrigated_at": timestamp
    }

@router.get("/{farm_id}/analytics")
def get_analytics(
    farm_id: str,
    user_id: str = Depends(get_current_user_id)
):
    user_object_id = ObjectId(user_id)

    # Fetch the farm data
    user_data = user_data_collection.find_one({
        "user_id": user_object_id,
        "farms.farm_id": farm_id
    })

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found"
        )

    farm = None

    for item in user_data["farms"]:
        if item["farm_id"] == farm_id:
            farm = item
            break
    
    irrigation_history = farm.get("irrigation_history", [])

    if irrigation_history:
        last_irrigation = max(irrigation_history)

        query = {
            "farm_id": farm_id,
            "timestamp": {
                "$gt": last_irrigation
            }
        }
    else:
        last_irrigation = None

        query = {
            "farm_id": farm_id
        }

    records = list(
        analytics_data_collection.find(
            query,
            {"_id": 0}
        ).sort("timestamp", 1)
    )

    latest_record = records[-1]
    TAW = latest_record["TAW"]
    RAW = latest_record["RAW"]

    poly_predictions = predict_depletion(
        records,
        TAW,
        degree=3
    )

    linear_predictions = predict_depletion_linear(
        timestamp=latest_record["timestamp"],
        ETc=latest_record["ET_c"],
        D_current=latest_record["D_current"],
        TAW=latest_record["TAW"]
    )

    hours_till_TAW = len(poly_predictions)

    forecast_data = get_forecast(
        farm["location"]["latitude"], 
        farm["location"]["longitude"],
        # hours= 2 * hours_till_TAW
        hours= hours_till_TAW
    )

    # histogram of water that can be pumped
    water_capacities_prediction = predict_water_capacity(
        forecast_data,
        farm["pump"],
        farm["power_source"]
    )

    field_area = convert_area_to_m2(
        farm["area"],
        farm["area_unit"]
    )

    start_time, end_time = predict_best_irrigation_window(
        latest_record=latest_record,
        poly_predictions=poly_predictions,
        forecast_data=forecast_data,
        water_capacities_prediction=water_capacities_prediction,
        field_area=field_area,
        RAW=RAW,
        TAW=TAW
    )    

    return {
        "farm_id": farm_id,
        "last_irrigation": last_irrigation,

        "current": {
            "TAW": TAW,
            "RAW": RAW,
            "ET_c": latest_record["ET_c"],
            "D_current": latest_record["D_current"],
            "timestamp": latest_record["timestamp"],
        },

        "actual_records": records,

        "depletion_prediction": {
            "polynomial": poly_predictions,
            "linear": linear_predictions,
            "hours_till_TAW": hours_till_TAW,
        },

        "water_capacity_prediction": water_capacities_prediction,

        "forecast_data" : forecast_data,

        "irrigation_window": {
            "start_time": start_time,
            "end_time": end_time,
        },
    }