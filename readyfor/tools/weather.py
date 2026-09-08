import httpx

from readyfor.tools.constants import WEATHER_CODES
from readyfor.tools.location import get_coordinates
from strands import tool

def get_weather(
    latitude: float,
    longitude: float,
    date: str,
    hour: int,
) -> dict:
    url = "https://api.open-meteo.com/v1/forecast"

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": (
            "temperature_2m,"
            "precipitation_probability,"
            "precipitation,"
            "weather_code"
        ),
        "temperature_unit": "fahrenheit",
        "timezone": "auto",
        "start_date": date,
        "end_date": date,
    }

    response = httpx.get(url, params=params)
    response.raise_for_status()

    data = response.json()

    target_time = f"{date}T{hour:02d}:00"

    times = data["hourly"]["time"]
    index = times.index(target_time)

    weather_code = data["hourly"]["weather_code"][index]

    return {
        "time": target_time,
        "temperature": data["hourly"]["temperature_2m"][index],
        "precipitation_probability": (
            data["hourly"]["precipitation_probability"][index]
        ),
        "precipitation": data["hourly"]["precipitation"][index],
        "conditions": WEATHER_CODES.get(weather_code, "Unknown"),
    }

@tool
def get_weather_for_location(
    location: str,
    date: str,
    hour: int,
) -> dict:
    coordinates = get_coordinates(location)

    weather = get_weather(
        coordinates["latitude"],
        coordinates["longitude"],
        date,
        hour,
    )

    return {
        "location": coordinates["name"],
        **weather,
    }