import math
from datetime import datetime, timedelta

import boto3
from strands import tool


@tool
def get_travel_time(
    origin_longitude: float,
    origin_latitude: float,
    destination_longitude: float,
    destination_latitude: float,
    travel_mode: str = "Car",
    appointment_time: str | None = None,
) -> dict:
    """Get a car, walking, or scheduled transit route. Appointment must include timezone.

    Transit requires an appointment time. Its returned departure already accounts
    for a 15-minute arrival buffer; do not subtract the buffer again.
    """
    if travel_mode not in {"Car", "Transit", "Pedestrian"}:
        raise ValueError("Please select a valid travel mode.")
    if travel_mode == "Transit" and not appointment_time:
        raise ValueError("Please select an appointment time for bus/train travel.")
    params = {
        "Origin": [origin_longitude, origin_latitude],
        "Destination": [destination_longitude, destination_latitude],
        "TravelMode": travel_mode,
    }
    if travel_mode == "Transit":
        appointment = datetime.fromisoformat(appointment_time)
        if appointment.tzinfo is None:
            raise ValueError("Appointment time must include a time zone.")
        params["ArrivalTime"] = (appointment - timedelta(minutes=15)).isoformat()
    if travel_mode == "Transit":
        params["MaxAlternatives"] = 2
    client = boto3.client("geo-routes", region_name="us-east-1")
    response = client.calculate_routes(**params)
    routes = response.get("Routes", [])
    if not routes:
        raise ValueError("No route was found for this travel mode and time. Try another time or mode.")
    options = []
    seen = set()
    rejection_reasons = []
    for route in routes:
        try:
            option = _route_result(route, travel_mode, params)
        except ValueError as error:
            rejection_reasons.append(str(error))
            continue
        signature = repr(option.get("legs", option))
        if signature not in seen:
            seen.add(signature)
            options.append(option)
    if not options:
        reasons = list(dict.fromkeys(rejection_reasons))
        if len(reasons) == 1:
            raise ValueError(reasons[0])
        raise ValueError("Could not use the returned routes: " + " ".join(reasons))
    return {**options[0], "alternatives": options[1:]}


def _route_result(route, travel_mode, params):
    summary = route["Summary"]
    result = {
        "travel_mode": travel_mode,
        "travel_minutes": math.ceil(summary["Duration"] / 60),
        "distance_meters": summary["Distance"],
    }
    if travel_mode == "Transit":
        # Preserve provider names and schedules instead of guessing transit lines.
        legs = []
        for leg in route.get("Legs", []):
            kind = leg.get("Type", "")
            details = leg.get(f"{kind}LegDetails", {})
            legs.append({
                "type": kind,
                **{key: details[key] for key in (
                    "Departure", "Arrival", "Transport", "Agency", "Summary",
                    "BeforeTravelSteps", "TravelSteps", "AfterTravelSteps",
                    "Notices", "Incidents", "Attributions",
                ) if key in details},
            })
        departure = legs[0].get("Departure", {}).get("Time") if legs else None
        arrival = legs[-1].get("Arrival", {}).get("Time") if legs else None
        if not departure or not arrival:
            raise ValueError("Transit schedule details were unavailable. Try another time or mode.")
        if datetime.fromisoformat(departure) <= datetime.now().astimezone():
            raise ValueError("This journey would require leaving in the past. Choose a later appointment or another mode.")
        if datetime.fromisoformat(arrival) > datetime.fromisoformat(params["ArrivalTime"]):
            raise ValueError("No transit route arrives in time with the 15-minute buffer. Try another time or mode.")
        walking_seconds = 0
        previous_arrival = None
        for leg in legs:
            start = leg.get("Departure", {}).get("Time")
            end = leg.get("Arrival", {}).get("Time")
            if not start or not end:
                raise ValueError("Incomplete route schedule.")
            start_dt, end_dt = datetime.fromisoformat(start), datetime.fromisoformat(end)
            seconds = (end_dt - start_dt).total_seconds()
            if seconds < 0 or (previous_arrival and start_dt < previous_arrival):
                raise ValueError("Inconsistent route schedule.")
            leg["duration_minutes"] = math.ceil(seconds / 60)
            leg["wait_before_minutes"] = math.ceil((start_dt - previous_arrival).total_seconds() / 60) if previous_arrival else 0
            previous_arrival = end_dt
            if leg["type"] == "Pedestrian":
                walking_seconds += seconds
        result["travel_minutes"] = math.ceil((datetime.fromisoformat(arrival) - datetime.fromisoformat(departure)).total_seconds() / 60)
        result["walking_minutes"] = math.ceil(walking_seconds / 60)
        result.update({
            "departure_time": departure,
            "arrival_time": arrival,
            "arrival_buffer_minutes": 15,
            "legs": legs,
            "notices": route.get("Notices", []),
        })
    return result
