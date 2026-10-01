# farm_calculator.py

from predict import identify_crop_stage
from open_meteo import get_weather
from crop_util import calculate_kc


def calculate_requirements(
    image_path,
    latitude,
    longitude,
    soil_moisture,
    field_area,
    crop="wheat",
    irrigation_efficiency=0.90
):
    """
    Calculate the crop and weather values required
    for the irrigation decision.

    Parameters
    ----------
    image_path : str
        Path to the crop image received from the request.

    latitude : float
        Farm latitude.

    longitude : float
        Farm longitude.

    soil_moisture : float
        Current soil moisture (%).

    field_area : float
        Field area in square meters.

    crop : str
        Crop name.

    irrigation_efficiency : float
        Irrigation system efficiency (0-1).

    Returns
    -------
    dict
        Values required by the irrigation module.
    """

    # --------------------------------------------------------
    # 1. Identify crop growth stage using the image
    # --------------------------------------------------------

    growth_stage, confidence = identify_crop_stage(
        image_path
    )


    # --------------------------------------------------------
    # 2. Get weather data using latitude/longitude
    # --------------------------------------------------------

    weather = get_weather(
        latitude,
        longitude
    )


    # --------------------------------------------------------
    # 3. Crop data
    # --------------------------------------------------------

    # Temporary prototype values.
    # Replace these with your proper FAO-56 crop database.

    crop_data = {
        "wheat": {

            "Seedling & Plant": {
                "stage": "initial",
                "kc": 0.30,
                "crop_height": 0.15
            },

            "Wheat Flowers": {
                "stage": "development",
                "kc": 1.15,
                "crop_height": 0.80
            },

            "Plant with Fruit": {
                "stage": "mid",
                "kc": 1.15,
                "crop_height": 1.00
            },

            "Fruit with Seeds": {
                "stage": "late",
                "kc": 0.40,
                "crop_height": 0.80
            }
        }
    }


    if crop not in crop_data:
        raise ValueError(
            f"Unsupported crop: {crop}"
        )

    if growth_stage not in crop_data[crop]:
        raise ValueError(
            f"No data for growth stage: {growth_stage}"
        )


    crop_info = crop_data[crop][growth_stage]

    kc_table = crop_info["kc"]
    crop_height = crop_info["crop_height"]
    formal_stage = crop_info["stage"]


    # --------------------------------------------------------
    # 4. Calculate adjusted Kc
    # --------------------------------------------------------

    kc = calculate_kc(
        kc_table=kc_table,
        wind_speed=weather.wind_speed,
        rh_min=weather.relative_humidity_min,
        crop_height=crop_height
    )


    # --------------------------------------------------------
    # 5. Calculate crop evapotranspiration
    # --------------------------------------------------------

    eto = weather.eto

    etc = kc * eto


    # --------------------------------------------------------
    # 6. Convert ETc from mm to water volume
    # --------------------------------------------------------

    # 1 mm of water over 1 m² = 1 litre

    crop_water_liters = (
        etc * field_area
    )


    # --------------------------------------------------------
    # 7. Account for irrigation efficiency
    # --------------------------------------------------------

    irrigation_water_liters = (
        crop_water_liters
        / irrigation_efficiency
    )


    # --------------------------------------------------------
    # 8. Return all required values
    # --------------------------------------------------------

    return {

        # Crop
        "crop": crop,
        "growth_stage": growth_stage,
        "growth_stage_confidence": round(
            confidence,
            3
        ),

        "formal_stage": formal_stage,

        # Kc
        "kc_table": kc_table,
        "kc": kc,
        "crop_height": crop_height,

        # Weather
        "temperature_max": weather.temperature_max,
        "temperature_min": weather.temperature_min,

        "relative_humidity_min":
            weather.relative_humidity_min,

        "wind_speed": weather.wind_speed,

        "rainfall": weather.rainfall,

        "solar_radiation":
            weather.solar_radiation,

        "eto": eto,

        # Field
        "soil_moisture": soil_moisture,
        "field_area": field_area,

        # Water requirement
        "etc": round(etc, 3),

        "crop_water_liters": round(
            crop_water_liters,
            2
        ),

        "irrigation_water_liters": round(
            irrigation_water_liters,
            2
        )
    }