from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from botocore.exceptions import BotoCoreError, ClientError
import boto3


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
    ],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)
allow_methods=["GET", "POST"],

class PrepareRequest(BaseModel):
    request: str
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    timezone: str



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

    return {
        "message": "Request received",
        "request": data.request,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "timezone": data.timezone,
        "current_time": now.isoformat(),
    }

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