from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field, AwareDatetime
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from botocore.exceptions import BotoCoreError, ClientError
from readyfor.tools.routing import get_travel_time
import boto3
import logging
from readyfor.agent import generate_plan

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

class Destination(BaseModel):
    place_id: str
    title: str
    address: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)

class PrepareRequest(BaseModel):
    request: str
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    timezone: str
    destination: Destination | None = None
    appointment_time: AwareDatetime | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/prepare")
def prepare(data: PrepareRequest):
    try:
        user_timezone = ZoneInfo(data.timezone)
    except (ZoneInfoNotFoundError, ValueError):
        raise HTTPException(
            status_code=422,
            detail="Please provide a valid time zone.",
        )

    now = datetime.now(user_timezone)
    if (
    data.appointment_time is not None
    and data.appointment_time <= datetime.now(user_timezone)
):
     raise HTTPException(
        status_code=422,
        detail="Please choose a future appointment date and time.",
    )
    travel = None

    travel = None

    if (
    data.latitude is not None
    and data.longitude is not None
    and data.destination is not None
):
        try:
            travel = get_travel_time(
                origin_longitude=data.longitude,
                origin_latitude=data.latitude,
                destination_longitude=data.destination.longitude,
                destination_latitude=data.destination.latitude,
            )
        except (BotoCoreError, ClientError) as error:
            raise HTTPException(
                status_code=503,
                detail="Could not calculate travel time. Please try again.",
            ) from error



    result = {
        "message": "Request received",
        "request": data.request,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "timezone": data.timezone,
        "current_time": now.isoformat(),
        "destination": (data.destination.model_dump() if data.destination else None),
        "travel": travel,
        "appointment_time": ( data.appointment_time.astimezone(user_timezone).isoformat()
    if data.appointment_time
    else None ),
        
    }
    try:
        result["plan"] = generate_plan(result)
    except Exception as error:
        logging.exception("ReadyFor plan generation failed")
        raise HTTPException(
            status_code=503,
            detail="Could not generate your plan. Please try again.",
        ) from error

    return result
    

@app.get("/places/suggest")
def suggest_places(
    query: str = Query(min_length=2, max_length=200),
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
):
    search_text = query.strip()

    if len(search_text) < 2:
        return {"suggestions": []}

    try:
        client = boto3.client("geo-places", region_name="us-east-1")

        response = client.suggest(
            QueryText=search_text,
            BiasPosition=[longitude, latitude],
            MaxResults=5,
        )
    except (BotoCoreError, ClientError) as error:
        raise HTTPException(
            status_code=503,
            detail="Place search is unavailable. Please try again.",
        ) from error

    suggestions = []

    for item in response.get("ResultItems", []):
        if item.get("SuggestResultItemType") == "Place":
            suggestions.append({
                "title": item["Title"],
                "place_id": item["Place"]["PlaceId"],
                "address": item["Place"].get("Address", {}).get("Label", ""),
            })

    return {"suggestions": suggestions}

@app.get("/places/details")
def get_place_details(
    place_id: str = Query(min_length=1, max_length=500),
):
    try:
        client = boto3.client("geo-places", region_name="us-east-1")

        response = client.get_place(
            PlaceId=place_id,
        )
    except (BotoCoreError, ClientError) as error:
        raise HTTPException(
            status_code=503,
            detail="Could not retrieve this place. Please try again.",
        ) from error

    longitude, latitude = response["Position"]

    return {
        "place_id": response["PlaceId"],
        "title": response["Title"],
        "address": response.get("Address", {}).get("Label", ""),
        "latitude": latitude,
        "longitude": longitude,
    }