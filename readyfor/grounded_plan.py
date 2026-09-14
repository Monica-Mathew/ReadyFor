"""Compose researched plans without rewriting findings or inventing travel data."""
import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from readyfor.tools.weather import get_weather


def compose_researched_plan(context):
    research = context["official_research"]
    zone = ZoneInfo(context.get("timezone", "America/New_York"))
    def parse(value):
        return datetime.fromisoformat(value).astimezone(zone)
    def display(value):
        return value.strftime("%B %d, %Y at %I:%M %p")
    travel = context.get("travel") or {}
    appointment = parse(context["appointment_time"]) if context.get("appointment_time") else None
    buffer = (context.get("arrival_buffer") or {}).get("minutes")
    parts = []
    if not context.get("route_card_displayed"):
        timing = ["### APPOINTMENT & ARRIVAL"]
        if appointment:
            timing.append("Appointment: **" + display(appointment) + "**.")
            if buffer is not None:
                target = appointment - timedelta(minutes=buffer)
                timing.append(f"Target arrival: **{display(target)}**, with a {buffer}-minute early-arrival buffer.")
        if travel.get("departure_time"):
            timing.append("Leave by **" + display(parse(travel["departure_time"])) + "**.")
        else:
            timing.append("Leave time is not available. Add your current location and select a destination to calculate the journey.")
        parts.append("\n\n".join(timing))
    destination = context.get("destination") or {}
    clothing = "Choose comfortable clothes and shoes for your visit. Weather-specific suggestions will appear when a forecast is available."
    weather_text = "Weather is unavailable until a destination and departure time are available."
    if travel.get("departure_time") and destination.get("latitude") is not None and destination.get("longitude") is not None:
        try:
            departure = parse(travel["departure_time"])
            weather = get_weather(destination["latitude"], destination["longitude"], departure.date().isoformat(), departure.hour, timezone_name=str(zone))
            temp = float(weather["temperature"])
            clothing = ("A warm coat and layers should help with the cold." if temp < 45 else
                        "A light jacket or sweater over comfortable layers should work well." if temp < 65 else
                        "Light, breathable clothes should be comfortable. Bring a light layer if you tend to get cold indoors.")
            conditions = str(weather.get("conditions", "")).lower()
            if any(word in conditions for word in ("rain", "drizzle", "shower", "snow")) or float(weather.get("precipitation_probability") or 0) >= 40:
                clothing += " Consider a rain jacket or umbrella and shoes that can handle wet conditions."
            if travel.get("travel_mode") in {"Transit", "Pedestrian"}:
                clothing += " Comfortable walking shoes will help for the walking parts of your trip."
            weather_text = f"Around departure: {weather['conditions']}, {weather['temperature']}°F. Chance of precipitation: {weather['precipitation_probability']}%."
        except Exception:
            weather_text = "The forecast could not be retrieved for this date."
    parts.append("### WEATHER & WHAT TO WEAR\n\n" + weather_text + "\n\n" + clothing)
    general_steps = research.get("general_steps") or []
    sections = research.get("review_sections") or []
    unresolved = [section for section in sections if section.get("status") != "supported"]
    if unresolved:
        parts.append("### SOME DETAILS NEED CONFIRMATION\n\n" + "\n".join(
            "- **" + section["title"] + ":** " + section["message"] for section in unresolved))
    if research.get("status") == "researched" and research.get("sources") and research.get("summary"):
        parts.append("### PREPARATION STEPS\n\nFollow the instructions for the option that matches your situation.\n\n" + research["summary"])
    elif general_steps:
        parts.append("### PREPARATION STEPS\n\nHere’s your general preparation guide. Each step includes its source; follow the conditions that apply to you.")
        for index, step in enumerate(general_steps, 1):
            title = step.get("title") or step["text"].split("\n")[0].split(". ")[0]
            title = re.sub(r"[\r\n#*_<>]", "", title).strip()
            if len(title) > 80:
                title = title[:77].rsplit(" ", 1)[0] + "…"
            text = re.sub(r"([\\`*_{}\[\]()#+.!<>-])", r"\\\1", step["text"])
            parts.append(f"### Step {index} — {title}\n\n{text}\n\n[Read source]({step['source_url']})")
    elif sections:
        # Keep useful evidence available without displaying four audit categories as the plan.
        supported = [section for section in sections if section.get("status") == "supported"]
        parts.append("### PREPARATION STEPS\n\nA complete preparation guide is not available yet. These source excerpts may help; keep the conditions in each excerpt in mind.")
        for section in supported:
            quote = re.sub(r"([\\`*_{}\[\]()#+.!<>-])", r"\\\1", section["quote"])
            parts.append("### " + section["title"] + "\n\n" + "\n".join("> " + line for line in quote.splitlines())
                         + "\n\n[Read source](" + section["source_url"] + ")")
    else:
        parts.append("### SOME DETAILS NEED CONFIRMATION\n\nPreparation requirements could not be retrieved. No official checklist has been generated.")
    questions = research.get("questions") or []
    if questions:
        parts.append("### DETAILS TO CONFIRM\n\nWant a more tailored plan? You can answer these optional questions:\n\n" + "\n".join("- " + question for question in questions[:3])
                     + "\n\nAdd any answers to your request and select Prepare Me again to refine the guidance above.")
    links = [source["url"] for source in research.get("sources", [])]
    if links:
        parts.append("### SOURCES READ\n\n" + "\n".join(f"- [Source {i}]({url})" for i, url in enumerate(links, 1)))
    if research.get("checked_at"):
        parts.append("Sources read: " + display(parse(research["checked_at"])) + ".")
    return "\n\n".join(parts)
