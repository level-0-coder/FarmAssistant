

from inference.predict import identify_crop_stage
from inference.open_meteo import get_weather
from inference.crop_util import calculate_kc
from inference.soil_grids_2 import get_root_zone_soil_moisture

crop_table = {
    "wheat": {
        "Seedling & Plant": {
            "stage": "initial",
            "Zr": 0.30,
            "Kc": 0.35,
            "p": 0.55,
            "crop_height": 0.15
        },

        "Wheat Flowers": {
            "stage": "development",
            "Zr": 0.60,
            "Kc": 0.75,
            "p": 0.50,
            "crop_height": 0.60
        },

        "Plant with Fruit": {
            "stage": "mid",
            "Zr": 1.00,
            "Kc": 1.15,
            "p": 0.50,
            "crop_height": 0.90
        },

        "Fruit with Seeds": {
            "stage": "late",
            "Zr": 0.90,
            "Kc": 0.45,
            "p": 0.55,
            "crop_height": 0.80
        }
    }
}

def calc(
        # image_path,
        latitude,
        longitude,
        theta_current,
        field_area,
        crop_growth_stage=None,
        humidity=None
):
    # ETc
    # D
    # TAW
    # RAW
    
    # crop_growth_stage, confidence = identify_crop_stage(
    #     image_path
    # )

    Z_r = crop_table["wheat"][crop_growth_stage]["Zr"]
    p = crop_table["wheat"][crop_growth_stage]["p"]
    kc_table = crop_table["wheat"][crop_growth_stage]["Kc"]
    crop_height = crop_table["wheat"][crop_growth_stage]["crop_height"]

    weather = get_weather(
        latitude,
        longitude
    )

    soil = get_root_zone_soil_moisture(
        latitude,
        longitude,
        Z_r
    )

    theta_FC = soil["theta_fc"]
    theta_WP = soil["theta_wp"]

    D_current = (theta_FC - theta_current) * Z_r * 1000

    TAW = (theta_FC - theta_WP) * Z_r * 1000

    RAW = p * TAW


    rh_min = (
        humidity
        if humidity is not None
        else weather.relative_humidity_min
    )

    K_c = calculate_kc(
        kc_table=kc_table,
        wind_speed=weather.wind_speed,
        rh_min=rh_min,
        crop_height=crop_height
    )
    ET_0 = weather.eto
    ET_c = K_c * ET_0

    # D_approx = D_current / E_a

    water_deficit = D_current * field_area

    return {
        "RAW": RAW,
        "TAW": TAW,
        "D_current": D_current,
        "ET_c": ET_c,
        "water_deficit": water_deficit,
    }

if __name__ == "__main__":

    image_path = "dataset/test.jpg"

    latitude = 12.95
    longitude = 80.14

    # Current soil moisture in m3/m3
    theta_current = 0.25

    # Field area in m2
    field_area = 1000

    try:
        result = calc(
            image_path=image_path,
            latitude=latitude,
            longitude=longitude,
            theta_current=theta_current,
            field_area=field_area,
            crop_growth_stage="Seedling & Plant"
        )

        print("\nIrrigation Calculation")
        print("-------------------------")
        print(f"RAW            : {result['RAW']:.2f} mm")
        print(f"TAW            : {result['TAW']:.2f} mm")
        print(f"D_current      : {result['D_current']:.2f} mm")
        print(f"ET_c            : {result['ET_c']:.2f} mm/day")
        print(f"Water deficit  : {result['water_deficit']:.2f} litres")

    except Exception as e:
        print(f"Calculation failed: {e}")