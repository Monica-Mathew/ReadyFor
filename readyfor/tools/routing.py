import math

import boto3
from strands import tool
    

@tool
def get_travel_time(
    origin_longitude: float,
    origin_latitude: float,
    destination_longitude: float,
    destination_latitude: float,
) -> dict:
    """Get driving travel time and distance between two coordinates."""
    client = boto3.client(
        "geo-routes",
        region_name="us-east-1",
    )

    response = client.calculate_routes(
        Origin=[
            origin_longitude,
            origin_latitude,
        ],
        Destination=[
            destination_longitude,
            destination_latitude,
        ],
        TravelMode="Car",
    )

    summary = response["Routes"][0]["Summary"]

    duration_seconds = summary["Duration"]
    distance_meters = summary["Distance"]

    return {
        "travel_minutes": math.ceil(duration_seconds / 60),
        "distance_meters": distance_meters,
    }