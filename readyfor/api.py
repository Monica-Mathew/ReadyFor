from fastapi import FastAPI
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
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

class PrepareRequest(BaseModel):
    request: str
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)



@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/prepare")
def prepare(data: PrepareRequest):
    return {
        "message": "Request received",
        "request": data.request,
        "latitude": data.latitude,
        "longitude": data.longitude,
    }