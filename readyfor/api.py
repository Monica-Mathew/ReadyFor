from readyfor.official_research import research_official_steps
from readyfor.arrival_buffer import choose_arrival_buffer
from fastapi.responses import StreamingResponse, Response
from queue import Queue, Empty
from threading import Thread, Event
import json
from typing import Literal
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field, AwareDatetime
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
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
    travel_mode: Literal["Car", "Transit", "Pedestrian"] = "Car"
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
    return _prepare(data)


def _prepare(data: PrepareRequest, progress=lambda message: None):
    progress("Checking your details…")
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
    if data.travel_mode == "Transit" and (
        data.appointment_time is None or data.destination is None
        or data.latitude is None or data.longitude is None
    ):
        raise HTTPException(status_code=422, detail="For bus/train travel, add your location, destination, and appointment time.")
    progress("Choosing an arrival buffer…")
    try:
        buffer = choose_arrival_buffer(data.request, data.destination.model_dump() if data.destination else None)
    except Exception as error:
        logging.exception("Arrival buffer selection failed")
        raise HTTPException(status_code=503, detail="Could not choose the arrival buffer. Please try again.") from error
    if buffer.get("needs_clarification"):
        raise HTTPException(status_code=422, detail=buffer["needs_clarification"])
    travel = None

    if (
    data.latitude is not None
    and data.longitude is not None
    and data.destination is not None
):
        try:
            progress("Finding routes…")
            travel = get_travel_time(
                origin_longitude=data.longitude,
                origin_latitude=data.latitude,
                destination_longitude=data.destination.longitude,
                destination_latitude=data.destination.latitude,
                travel_mode=data.travel_mode,
                buffer_minutes=buffer["minutes"],
                appointment_time=data.appointment_time.isoformat() if data.appointment_time else None,
            )
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        except (BotoCoreError, ClientError) as error:
            raise HTTPException(
                status_code=503,
                detail="Could not calculate travel time. Please try again.",
            ) from error



    if travel and data.appointment_time and not travel.get("departure_time"):
        travel["departure_time"] = (data.appointment_time - timedelta(minutes=travel["travel_minutes"] + buffer["minutes"])).isoformat()
    if travel and data.appointment_time:
        for option in [travel, *travel.get("alternatives", [])]:
            option["arrival_buffer_minutes"] = buffer["minutes"]
            option["buffer_reason"] = buffer["reason"]
            option["buffer_source"] = buffer["source"]
            option["target_arrival_time"] = (data.appointment_time - timedelta(minutes=buffer["minutes"])).astimezone(user_timezone).isoformat()
            if option.get("departure_time"):
                option["departure_time"] = datetime.fromisoformat(option["departure_time"]).astimezone(user_timezone).isoformat()
        if datetime.fromisoformat(travel["departure_time"]) <= now:
            raise HTTPException(status_code=422, detail="You would need to leave before now to arrive with this buffer. Choose a later time or another route.")
    result = {
        "message": "Request received",
        "request": data.request,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "timezone": data.timezone,
        "current_time": now.isoformat(),
        "destination": (data.destination.model_dump() if data.destination else None),
        "travel": travel,
        "arrival_buffer": buffer,
        "route_card_displayed": bool(travel and travel.get("departure_time")),
        "travel_mode": data.travel_mode,
        "appointment_time": ( data.appointment_time.astimezone(user_timezone).isoformat()
    if data.appointment_time
    else None ),
        
    }
    # Reuse the existing activity classification: ordinary visits do not need web research.
    research = None
    if buffer.get("category") == "government":
        progress("Checking official preparation instructions…")
        try:
            research = research_official_steps(data.request, result["destination"])
        except Exception:
            logging.exception("ReadyFor preparation research unavailable")
            research = {"status": "unavailable", "sources": [], "summary": "", "error_code": "research_unavailable"}
    result["official_research"] = research
    research_status = research.get("status", "unavailable") if research is not None else "not_needed"
    sources = (research or {}).get("sources") or []
    logging.warning("ReadyFor research completed: status=%s sources=%d code=%s",
                    research_status, len(sources), (research or {}).get("error_code", "none"))
    if research is not None and research_status not in {"researched", "not_needed"}:
        result["message"] = "Your plan is ready; some preparation details could not be verified."
    try:
        if travel and travel.get("travel_mode") == "Transit":
            alternatives = travel.pop("alternatives", [])
            result["routes"] = []
            for number, route in enumerate([travel, *alternatives], start=1):
                progress(f"Putting your plan together — route {number} of {1 + len(alternatives)}…")
                route_context = {**result, "travel": route, "route_card_displayed": True}
                route_context.pop("routes", None)
                result["routes"].append({
                    "travel": route,
                    "plan": generate_plan(route_context),
                })
            result["plan"] = result["routes"][0]["plan"]
        else:
            progress("Putting your plan together…")
            result["plan"] = generate_plan(result)
    except Exception as error:
        logging.exception("ReadyFor plan generation failed")
        raise HTTPException(
            status_code=503,
            detail="Could not generate your plan. Please try again.",
        ) from error

    if research:
        # Keep source links/date in saved plans, without duplicating full scraped documents.
        result["official_research"] = {**research, "sources": [{"url": source["url"]} for source in research.get("sources", [])]}
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

@app.post("/prepare/stream")
def prepare_stream(data: PrepareRequest):
    """Stream actual preparation stages, then the same result as /prepare."""
    def events():
        queue = Queue()
        stopped = Event()
        def progress(message):
            if stopped.is_set():
                raise RuntimeError("Client disconnected")
            queue.put({"type": "progress", "message": message})
        def work():
            try:
                result = _prepare(data, progress)
                queue.put({"type": "result", "data": result})
            except HTTPException as error:
                queue.put({"type": "error", "message": error.detail})
            except Exception:
                logging.exception("Streaming preparation failed")
                queue.put({"type": "error", "message": "Could not prepare your plan. Please try again."})
        Thread(target=work, daemon=True).start()
        try:
            while True:
                try:
                    event = queue.get(timeout=10)
                except Empty:
                    yield "\n"
                    continue
                yield json.dumps(event) + "\n"
                if event["type"] in {"result", "error"}:
                    break
        finally:
            stopped.set()
    return StreamingResponse(events(), media_type="application/x-ndjson",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/reminder.ics")
def calendar_reminder(
    departure: AwareDatetime,
    activity: str = Query(max_length=500),
    destination: str = Query(default="", max_length=1000),
):
    from readyfor.calendar_reminder import make_calendar
    if departure <= datetime.now().astimezone():
        raise HTTPException(status_code=422, detail="That leave time has passed. Prepare a new plan first.")
    return Response(make_calendar(departure, activity, destination), media_type="text/calendar",
                    headers={"Content-Disposition": 'attachment; filename="readyfor-reminder.ics"', "Cache-Control": "no-store"})
