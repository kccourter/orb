from __future__ import annotations

from datetime import UTC, datetime, timedelta
from math import cos, pi, sin
from typing import Annotated

from fastapi import FastAPI, Query, status
from fastapi.responses import JSONResponse

from orb_lab.models import (
    DemoPropagationSample,
    DemoStateVector,
    ErrorResponse,
    TlePropagationRequest,
)

app = FastAPI(title="Orb Lab API")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/propagate/demo", response_model=DemoPropagationSample)
def propagate_demo(
    minutes: Annotated[int, Query(ge=1, le=720)] = 90,
    step_seconds: Annotated[int, Query(ge=10, le=600)] = 60,
) -> DemoPropagationSample:
    """Return a deterministic circular-orbit placeholder for frontend wiring."""
    epoch = datetime.now(UTC).replace(microsecond=0)
    samples: list[DemoStateVector] = []
    radius_km = 6778.0
    period_seconds = 92.5 * 60.0

    for offset in range(0, minutes * 60 + 1, step_seconds):
        angle = 2.0 * pi * offset / period_seconds
        samples.append(
            DemoStateVector(
                epoch=epoch + timedelta(seconds=offset),
                position_km=(radius_km * cos(angle), radius_km * sin(angle), 0.0),
                velocity_km_s=(-7.66 * sin(angle), 7.66 * cos(angle), 0.0),
            )
        )

    return DemoPropagationSample(source="demo-circular-placeholder", samples=samples)


@app.post(
    "/propagate/tle",
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
    responses={
        status.HTTP_501_NOT_IMPLEMENTED: {
            "model": ErrorResponse,
            "description": "Orekit TLE propagation is planned but not yet implemented.",
        }
    },
)
def propagate_tle(request: TlePropagationRequest) -> JSONResponse:
    """Validate the Goal 02 TLE propagation contract before Orekit is wired in."""
    _ = request
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={
            "error": {
                "code": "orekit_propagation_not_implemented",
                "message": "Orekit TLE propagation is not implemented yet.",
            }
        },
    )


def main() -> None:
    import uvicorn

    uvicorn.run("orb_lab.api:app", host="127.0.0.1", port=8000, reload=True)
