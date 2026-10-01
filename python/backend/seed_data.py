# seed_database.py

from datetime import datetime, timedelta, timezone
from bson import ObjectId
import random

from backend.database import (
    users_collection,
    user_data_collection,
    sensor_products_collection,
    units_collection,
    sensor_readings_collection,
    analytics_data_collection,
)

from backend.auth.security import hash_password


# ============================================================
# CONFIG
# ============================================================

EMAIL = "farmer@test.com"
PASSWORD = "password123"

FARM_ID = "farm_demo_001"

SOIL_PRODUCT_ID = "MH-001"
SOIL_UNIT_ID = "UNIT-MH-00001"

CAMERA_PRODUCT_ID = "CAM-001"
CAMERA_UNIT_ID = "UNIT-CAM-00001"

TOTAL_HOURS = 72

# Irrigation happened 48 hours before the latest record.
POST_IRRIGATION_HOURS = 48

random.seed(42)


# ============================================================
# 1. CLEAR EXISTING DEVELOPMENT DATA
# ============================================================

print("\nClearing existing data...")

users_collection.delete_many({})
user_data_collection.delete_many({})
sensor_products_collection.delete_many({})
units_collection.delete_many({})
sensor_readings_collection.delete_many({})
analytics_data_collection.delete_many({})

print("Database cleared.")


# ============================================================
# 2. CREATE USER
#    Matches your auth/register schema
# ============================================================

user_id = ObjectId()

users_collection.insert_one({
    "_id": user_id,
    "email": EMAIL,
    "password_hash": hash_password(PASSWORD),
    "auth_provider": "local"
})

print(f"Created user: {EMAIL}")


# ============================================================
# 3. CREATE PROFILE + EMPTY FARMS ARRAY
#    Exactly matches your profile schema
# ============================================================

user_data_collection.insert_one({
    "user_id": user_id,

    "profile": {
        "name": "Sanjay Farmer",
        "age": 24,
        "gender": "male",
        "phone": "9876543210",

        "location": {
            "state": "Tamil Nadu",
            "district": "Coimbatore",
            "village": "Demo Village",
            "pincode": "641001"
        },

        "farming": {
            "experience_years": 5,
            "farmer_type": "owner",
            "farming_type": "crop",
            "total_area": 1.0,
            "area_unit": "acre"
        },

        "preferences": {
            "language": "English",
            "notification": "enabled"
        }
    },

    "farms": []
})


# ============================================================
# 4. CREATE SENSOR PRODUCTS
#    Matches SensorProductCreate
# ============================================================

sensor_products_collection.insert_many([
    {
        "_id": SOIL_PRODUCT_ID,
        "name": "Soil Moisture + Humidity Unit",
        "description": "Field sensor for soil moisture and humidity",
        "capabilities": [
            "soil_moisture",
            "humidity"
        ]
    },

    {
        "_id": CAMERA_PRODUCT_ID,
        "name": "Crop Camera Unit",
        "description": "Camera unit for crop growth-stage detection",
        "capabilities": [
            "camera"
        ]
    }
])

print("Created sensor products.")


# ============================================================
# 5. CREATE PHYSICAL UNITS
#    Matches UnitCreate + create_unit()
# ============================================================

now = datetime.now(timezone.utc)

units_collection.insert_many([
    {
        "_id": SOIL_UNIT_ID,
        "product_id": SOIL_PRODUCT_ID,
        "status": "assigned",
        "latest_reading": None,
        "created_at": now
    },

    {
        "_id": CAMERA_UNIT_ID,
        "product_id": CAMERA_PRODUCT_ID,
        "status": "assigned",
        "latest_reading": None,
        "created_at": now
    }
])

print("Created sensor units.")


# ============================================================
# 6. TIME RANGE FOR SYNTHETIC HISTORY
# ============================================================

end_time = now.replace(
    minute=0,
    second=0,
    microsecond=0
)

start_time = end_time - timedelta(
    hours=TOTAL_HOURS - 1
)

# Irrigation happened exactly 48 hours before the latest record.
irrigation_time = end_time - timedelta(
    hours=POST_IRRIGATION_HOURS
)


# ============================================================
# 7. CREATE FARM
#    Matches FarmCreateRequest + fields added later by system
# ============================================================

farm = {
    "farm_id": FARM_ID,

    "name": "Demo Wheat Farm",

    "crop": "wheat",

    "area": 1.0,
    "area_unit": "acre",

    "location": {
        "latitude": 11.0168,
        "longitude": 76.9558
    },

    "water_source": "borewell",

    "power_source": {
        "type": "solar",
        "solar_capacity": 5.0,
        "panel_tilt": 20.0,
        "panel_direction": 180.0
    },

    "pump": {
        "rated_power_hp": 5.0,
        "rated_flow_lpm": 100.0,
        "rated_head_m": 25.0
    },

    "soil": {
        "type": "loam",
        "ph": 6.8,
        "theta_fc": 0.30,
        "theta_wp": 0.15
    },

    "irrigation_method": "drip",

    "units": [
        SOIL_UNIT_ID,
        CAMERA_UNIT_ID
    ],

    # This gets added/updated by the camera workflow in production.
    # It is needed by your scheduler/calc pipeline.
    "crop_stage": {
        "stage": "Wheat Flowers",
        "confidence": 0.94,
        "observed_at": end_time
    },

    # Added by /{farm_id}/irrigate in production.
    "irrigation_history": [
        irrigation_time
    ]
}


# ============================================================
# 8. ADD FARM TO THIS USER
# ============================================================

result = user_data_collection.update_one(
    {
        "user_id": user_id
    },
    {
        "$push": {
            "farms": farm
        }
    }
)

if result.matched_count != 1:
    raise RuntimeError("Failed to attach farm to user.")

print(f"Created farm: {FARM_ID}")


# ============================================================
# 9. SYNTHETIC ANALYTICS PARAMETERS
#
# Wheat Flowers:
# Zr = 0.60 m
# theta_fc = 0.30
# theta_wp = 0.15
#
# TAW = 1000 * (0.30 - 0.15) * 0.60 = 90 mm
# RAW = 0.50 * 90 = 45 mm
# ============================================================

TAW = 90.0
RAW = 45.0
ETC = 3.8

ROOT_DEPTH = 0.60
THETA_FC = 0.30

FIELD_AREA_M2 = 4046.8564224  # 1 acre


# ============================================================
# 10. GENERATE 72 HOURLY SENSOR + ANALYTICS RECORDS
# ============================================================

sensor_documents = []
analytics_documents = []

# Start before irrigation.
D_current = 28.0


for hour in range(TOTAL_HOURS):

    timestamp = start_time + timedelta(hours=hour)

    # --------------------------------------------------------
    # BEFORE IRRIGATION
    # --------------------------------------------------------

    if timestamp < irrigation_time:

        D_current += 0.40

    # --------------------------------------------------------
    # IRRIGATION EVENT
    # --------------------------------------------------------

    elif timestamp == irrigation_time:

        D_current = 28.0

    # --------------------------------------------------------
    # AFTER IRRIGATION
    # --------------------------------------------------------

    else:

        D_current += 0.60

    # --------------------------------------------------------
    # Add a small synthetic measurement error.
    # --------------------------------------------------------

    observed_D = D_current + random.uniform(
        -0.15,
        0.15
    )

    observed_D = max(
        0.0,
        min(
            observed_D,
            TAW - 1.0
        )
    )

    # --------------------------------------------------------
    # Convert depletion back into soil volumetric moisture.
    #
    # D = (theta_fc - theta_current) * Zr * 1000
    #
    # theta_current =
    # theta_fc - D / (Zr * 1000)
    # --------------------------------------------------------

    theta_current = (
        THETA_FC
        - observed_D / (ROOT_DEPTH * 1000)
    )

    theta_current = max(
        0.15,
        min(
            theta_current,
            THETA_FC
        )
    )

    # --------------------------------------------------------
    # Synthetic humidity
    # --------------------------------------------------------

    humidity = 70.0 + random.uniform(
        -5.0,
        5.0
    )

    # --------------------------------------------------------
    # Water deficit
    # 1 mm over 1 m² = 1 litre
    # --------------------------------------------------------

    water_deficit = (
        observed_D * FIELD_AREA_M2
    )

    # --------------------------------------------------------
    # SENSOR READING
    # Exactly matches your sensor reading schema.
    # --------------------------------------------------------

    sensor_documents.append({
        "unit_id": SOIL_UNIT_ID,

        "timestamp": timestamp,

        "readings": {
            "soil_moisture": round(
                theta_current,
                4
            ),

            "humidity": round(
                humidity,
                2
            )
        }
    })

    # --------------------------------------------------------
    # ANALYTICS RECORD
    # Exactly matches what your scheduler inserts.
    # --------------------------------------------------------

    analytics_documents.append({
        "farm_id": FARM_ID,

        "timestamp": timestamp,

        "RAW": RAW,

        "TAW": TAW,

        "D_current": round(
            observed_D,
            3
        ),

        "ET_c": ETC,

        "water_deficit": round(
            water_deficit,
            2
        )
    })


# ============================================================
# 11. INSERT SENSOR HISTORY
# ============================================================

sensor_readings_collection.insert_many(
    sensor_documents
)

print(
    f"Inserted {len(sensor_documents)} sensor readings."
)


# ============================================================
# 12. UPDATE LATEST SENSOR READING
#    Exactly matches create_sensor_reading()
# ============================================================

latest_sensor = sensor_documents[-1]

units_collection.update_one(
    {
        "_id": SOIL_UNIT_ID
    },
    {
        "$set": {
            "latest_reading": {
                **latest_sensor["readings"],
                "timestamp": latest_sensor["timestamp"]
            }
        }
    }
)


# ============================================================
# 13. CAMERA UNIT INITIAL STATE
# ============================================================

units_collection.update_one(
    {
        "_id": CAMERA_UNIT_ID
    },
    {
        "$set": {
            "latest_image": None
        }
    }
)


# ============================================================
# 14. INSERT ANALYTICS HISTORY
# ============================================================

analytics_data_collection.insert_many(
    analytics_documents
)

print(
    f"Inserted {len(analytics_documents)} analytics records."
)


# ============================================================
# 15. INDEXES
# ============================================================

users_collection.create_index(
    [("email", 1)],
    unique=True
)

user_data_collection.create_index(
    [("user_id", 1)]
)

sensor_readings_collection.create_index(
    [("unit_id", 1), ("timestamp", -1)]
)

analytics_data_collection.create_index(
    [("farm_id", 1), ("timestamp", -1)]
)


# ============================================================
# 16. VERIFY ALL RELATIONSHIPS
# ============================================================

user = users_collection.find_one({
    "_id": user_id
})

assert user is not None

user_data = user_data_collection.find_one({
    "user_id": user_id
})

assert user_data is not None

farm_from_db = next(
    farm
    for farm in user_data["farms"]
    if farm["farm_id"] == FARM_ID
)

assert farm_from_db["units"] == [
    SOIL_UNIT_ID,
    CAMERA_UNIT_ID
]

assert units_collection.find_one({
    "_id": SOIL_UNIT_ID,
    "product_id": SOIL_PRODUCT_ID
})

assert units_collection.find_one({
    "_id": CAMERA_UNIT_ID,
    "product_id": CAMERA_PRODUCT_ID
})

assert sensor_readings_collection.count_documents({
    "unit_id": SOIL_UNIT_ID
}) == TOTAL_HOURS

assert analytics_data_collection.count_documents({
    "farm_id": FARM_ID
}) == TOTAL_HOURS

assert analytics_data_collection.count_documents({
    "farm_id": FARM_ID,
    "timestamp": {
        "$gt": irrigation_time
    }
}) == POST_IRRIGATION_HOURS


# ============================================================
# 17. OUTPUT LOGIN DETAILS
# ============================================================

print("\n" + "=" * 70)
print("SEED COMPLETE")
print("=" * 70)

print(f"Login email       : {EMAIL}")
print(f"Login password    : {PASSWORD}")
print(f"User ID           : {user_id}")
print(f"Farm ID           : {FARM_ID}")

print()
print(f"Soil unit         : {SOIL_UNIT_ID}")
print(f"Camera unit       : {CAMERA_UNIT_ID}")

print()
print(f"History start     : {start_time}")
print(f"History end       : {end_time}")
print(f"Irrigation        : {irrigation_time}")

print()
print(f"Sensor records    : {TOTAL_HOURS}")
print(f"Analytics records : {TOTAL_HOURS}")
print(
    f"Current cycle     : {POST_IRRIGATION_HOURS} hours"
)

print("=" * 70)


# Clearing existing data...
# Database cleared.
# Created user: farmer@test.com
# Created sensor products.
# Created sensor units.
# Created farm: farm_demo_001
# Inserted 72 sensor readings.
# Inserted 72 analytics records.

# ======================================================================
# SEED COMPLETE
# ======================================================================
# Login email       : farmer@test.com
# Login password    : password123
# User ID           : 6ababa6b66cc9a39096c27a0
# Farm ID           : farm_demo_001

# Soil unit         : UNIT-MH-00001
# Camera unit       : UNIT-CAM-00001

# History start     : 2026-09-25 20:00:00+00:00
# History end       : 2026-09-28 19:00:00+00:00
# Irrigation        : 2026-09-26 19:00:00+00:00

# Sensor records    : 72
# Analytics records : 72
# Current cycle     : 48 hours
# ======================================================================