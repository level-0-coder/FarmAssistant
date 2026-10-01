from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from backend.database import (
    user_data_collection,
    units_collection,
    sensor_products_collection,
    analytics_data_collection
)

from inference.calc import calc


# --------------------------------------------------
# Scheduler
# --------------------------------------------------

scheduler = BackgroundScheduler()


# --------------------------------------------------
# Helpers
# --------------------------------------------------

def convert_area_to_m2(
    area: float,
    unit: str
) -> float:

    conversions = {
        "m2": 1.0,
        "sq_m": 1.0,
        "acre": 4046.8564224,
        "hectare": 10000.0
    }

    if unit not in conversions:
        raise ValueError(
            f"Unsupported area unit: {unit}"
        )

    return area * conversions[unit]


def get_latest_soil_moisture(farm):
    """
    Find a soil-moisture-capable unit assigned
    to this farm and return its latest reading.
    """

    unit_ids = farm.get("units", [])

    if not unit_ids:
        return None

    units = units_collection.find({
        "_id": {"$in": unit_ids}
    })

    for unit in units:

        product_id = unit.get("product_id")

        if not product_id:
            continue

        product = sensor_products_collection.find_one({
            "_id": product_id
        })

        if not product:
            continue

        capabilities = product.get(
            "capabilities",
            []
        )

        if "soil_moisture" not in capabilities:
            continue

        latest_reading = unit.get(
            "latest_reading"
        )

        if not latest_reading:
            continue

        soil_moisture = latest_reading.get(
            "soil_moisture"
        )

        if soil_moisture is None:
            continue

        return soil_moisture

    return None

def get_latest_sensor_data(farm):
    """
    Find a sensor unit assigned to this farm
    and return its latest soil moisture and humidity.
    """

    unit_ids = farm.get("units", [])

    if not unit_ids:
        return {
            "soil_moisture": None,
            "humidity": None
        }

    units = units_collection.find({
        "_id": {"$in": unit_ids}
    })

    soil_moisture = None
    humidity = None

    for unit in units:
        product_id = unit.get("product_id")

        if not product_id:
            continue

        product = sensor_products_collection.find_one({
            "_id": product_id
        })

        if not product:
            continue

        capabilities = product.get(
            "capabilities",
            []
        )

        latest_reading = unit.get("latest_reading")

        if not latest_reading:
            continue

        # Get soil moisture if this unit supports it
        if "soil_moisture" in capabilities:
            value = latest_reading.get("soil_moisture")

            if value is not None:
                soil_moisture = value

        # Get humidity if this unit supports it
        if "humidity" in capabilities:
            value = latest_reading.get("humidity")

            if value is not None:
                humidity = value

        # Stop once we have both
        if soil_moisture is not None and humidity is not None:
            break

    return {
        "soil_moisture": soil_moisture,
        "humidity": humidity
    }

# --------------------------------------------------
# Process one farm
# --------------------------------------------------

def process_farm(farm):

    farm_id = farm["farm_id"]

    # --------------------------------------------------
    # Location
    # --------------------------------------------------

    location = farm.get("location")

    if not location:
        print(
            f"[Scheduler] Skipping {farm_id}: "
            "location not configured"
        )
        return

    latitude = location.get("latitude")
    longitude = location.get("longitude")

    if latitude is None or longitude is None:
        print(
            f"[Scheduler] Skipping {farm_id}: "
            "invalid location"
        )
        return

    # --------------------------------------------------
    # Field area
    # --------------------------------------------------

    area = farm.get("area")
    area_unit = farm.get("area_unit")

    if area is None or not area_unit:
        print(
            f"[Scheduler] Skipping {farm_id}: "
            "field area not configured"
        )
        return

    field_area = convert_area_to_m2(
        area,
        area_unit
    )

    # --------------------------------------------------
    # Crop stage
    # --------------------------------------------------

    crop_stage_data = farm.get("crop_stage")

    if not crop_stage_data:
        print(
            f"[Scheduler] Skipping {farm_id}: "
            "crop stage not available"
        )
        return

    crop_stage = crop_stage_data.get("stage")

    if not crop_stage:
        print(
            f"[Scheduler] Skipping {farm_id}: "
            "invalid crop stage"
        )
        return

    # --------------------------------------------------
    # Latest soil moisture
    # --------------------------------------------------

    # theta_current = get_latest_soil_moisture(farm)
    sensor_data = get_latest_sensor_data(farm)

    theta_current = sensor_data["soil_moisture"]
    humidity = sensor_data["humidity"]

    if theta_current is None:
        print(
            f"[Scheduler] Skipping {farm_id}: "
            "soil moisture not available"
        )
        return

    # --------------------------------------------------
    # Calculate
    # --------------------------------------------------

    result = calc(
        latitude=latitude,
        longitude=longitude,
        theta_current=theta_current,
        field_area=field_area,
        crop_growth_stage=crop_stage,
        humidity=humidity
    )

    # --------------------------------------------------
    # Store analytics data
    # --------------------------------------------------

    timestamp = datetime.now(timezone.utc)

    analytics_data_collection.insert_one({
        "farm_id": farm_id,
        "timestamp": timestamp,

        "RAW": result["RAW"],
        "TAW": result["TAW"],
        "D_current": result["D_current"],
        "ET_c": result["ET_c"],
        "water_deficit": result["water_deficit"]
    })

    print(
        f"[Scheduler] Processed farm: {farm_id}"
    )


# --------------------------------------------------
# Hourly Job
# --------------------------------------------------

def hourly_analytics_job():

    print(
        "\n[Scheduler] Running analytics job..."
    )

    user_data_documents = user_data_collection.find(
        {},
        {
            "farms": 1
        }
    )

    for user_data in user_data_documents:

        for farm in user_data.get(
            "farms",
            []
        ):

            try:

                process_farm(farm)

            except Exception as e:

                print(
                    f"[Scheduler] Error processing "
                    f"{farm.get('farm_id')}: {e}"
                )

    print(
        "[Scheduler] Analytics job completed.\n"
    )


# --------------------------------------------------
# Start Scheduler
# --------------------------------------------------

def start_scheduler():

    if scheduler.running:
        return

    scheduler.add_job(
        hourly_analytics_job,
        trigger="interval",
        hours=1,
        # minutes=5,
        id="hourly_analytics",
        replace_existing=True
    )

    scheduler.start()

    print(
        "[Scheduler] Started"
    )


# --------------------------------------------------
# Stop Scheduler
# --------------------------------------------------

def stop_scheduler():

    if not scheduler.running:
        return

    scheduler.shutdown(
        wait=False
    )

    print(
        "[Scheduler] Stopped"
    )


# --------------------------------------------------
# Manual Test
# --------------------------------------------------

if __name__ == "__main__":

    print(
        "Running scheduler job manually..."
    )

    hourly_analytics_job()