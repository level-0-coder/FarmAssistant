import requests
from dataclasses import dataclass


@dataclass
class WeatherData:
    temperature_max: float
    temperature_min: float
    dew_point: float
    wind_speed: float
    rainfall: float
    solar_radiation: float
    relative_humidity_min: float
    eto: float


def get_weather(latitude, longitude):

    url = "https://api.open-meteo.com/v1/forecast"

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": [
            "temperature_2m_max",
            "temperature_2m_min",
            "dew_point_2m_mean",
            "wind_speed_10m_mean",
            "relative_humidity_2m_min",
            "rain_sum",
            "shortwave_radiation_sum",
            "et0_fao_evapotranspiration"
        ],
        "timezone": "auto"
    }

    response = requests.get(url, params=params)

    response.raise_for_status()

    data = response.json()
    # print(data)
    daily = data["daily"]

    return WeatherData(
        temperature_max=daily["temperature_2m_max"][0],
        temperature_min=daily["temperature_2m_min"][0],
        dew_point=daily["dew_point_2m_mean"][0],
        wind_speed=daily["wind_speed_10m_mean"][0],
        rainfall=daily["rain_sum"][0],
        solar_radiation=daily["shortwave_radiation_sum"][0],
        relative_humidity_min=daily["relative_humidity_2m_min"][0],
        eto=daily["et0_fao_evapotranspiration"][0]
    )


import requests


def get_forecast(latitude: float, longitude: float, hours: int = 12):
    url = "https://api.open-meteo.com/v1/forecast"

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": [
            "precipitation",
            "precipitation_probability",
            "shortwave_radiation"
        ],
        "forecast_hours": hours,
        "timezone": "auto"
    }

    response = requests.get(url, params=params)
    response.raise_for_status()

    data = response.json()
    # print(data)

    hourly = data["hourly"]

    forecast = []

    for i in range(len(hourly["time"])):
        forecast.append({
            "time": hourly["time"][i],
            "rain_mm": hourly["precipitation"][i],
            "rain_probability": hourly["precipitation_probability"][i],
            "solar_radiation": hourly["shortwave_radiation"][i]
        })

    return forecast

if __name__ == "__main__":
    latitude = 40.7128
    longitude = -74.0060

    weather_data = get_weather(latitude, longitude)

    print(weather_data)

    forecast_data = get_forecast(latitude, longitude, hours=12)
    
    print(forecast_data)