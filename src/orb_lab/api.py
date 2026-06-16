from __future__ import annotations

from datetime import UTC, datetime, timedelta
from math import cos, pi, sin
from typing import Annotated

from fastapi import FastAPI, Query
from pydantic import BaseModel, Field


class StateVector(BaseModel):
    epoch: datetime
    frame: str = "EME2000"
    position_km: tuple[float, float, float]
    velocity_km_s: tuple[float, float, float]


class PropagationSample(BaseModel):
    source: str
    samples: list[StateVector] = Field(default_factory=list)


app = FastAPI(title="Orb Lab API")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/propagate/demo", response_model=PropagationSample)
def propagate_demo(
    minutes: Annotated[int, Query(ge=1, le=720)] = 90,
    step_seconds: Annotated[int, Query(ge=10, le=600)] = 60,
) -> PropagationSample:
    """Return a deterministic circular-orbit placeholder for frontend wiring."""
    epoch = datetime.now(UTC).replace(microsecond=0)
    samples: list[StateVector] = []
    radius_km = 6778.0
    period_seconds = 92.5 * 60.0

    for offset in range(0, minutes * 60 + 1, step_seconds):
        angle = 2.0 * pi * offset / period_seconds
        samples.append(
            StateVector(
                epoch=epoch + timedelta(seconds=offset),
                position_km=(radius_km * cos(angle), radius_km * sin(angle), 0.0),
                velocity_km_s=(-7.66 * sin(angle), 7.66 * cos(angle), 0.0),
            )
        )

    return PropagationSample(source="demo-circular-placeholder", samples=samples)


def main() -> None:
    import uvicorn

    uvicorn.run("orb_lab.api:app", host="127.0.0.1", port=8000, reload=True)
