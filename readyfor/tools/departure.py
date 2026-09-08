from datetime import datetime, timedelta
from strands import tool

@tool
def calculate_departure_time(
    appointment_time: str,
    travel_minutes: int,
    buffer_minutes: int = 15,
) -> str:
    appointment = datetime.fromisoformat(appointment_time)

    departure = appointment - timedelta(
        minutes=travel_minutes + buffer_minutes
    )

    return departure.isoformat()