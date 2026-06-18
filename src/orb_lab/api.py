from __future__ import annotations

from datetime import UTC, datetime, timedelta
from math import cos, pi, sin
from typing import Annotated

from fastapi import FastAPI, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from orb_lab.models import (
    DemoPropagationSample,
    DemoStateVector,
    ErrorResponse,
    NormalizedScenario,
    ScenarioExampleSummary,
    ScenarioNormalizeRequest,
    TlePropagationRequest,
    TlePropagationResponse,
)
from orb_lab.orekit_runtime import OrekitRuntimeError
from orb_lab.propagation import (
    TlePropagationError,
)
from orb_lab.propagation import (
    propagate_tle as run_tle_propagation,
)
from orb_lab.scenarios import (
    ScenarioLoadError,
)
from orb_lab.scenarios import (
    list_example_scenarios as get_example_scenarios,
)
from orb_lab.scenarios import (
    load_example_scenario as get_example_scenario,
)
from orb_lab.scenarios import (
    normalize_scenario as run_scenario_normalization,
)

app = FastAPI(title="Orb Lab API")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["content-type"],
)


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


@app.get("/scenarios/examples", response_model=list[ScenarioExampleSummary])
def list_scenario_examples() -> list[ScenarioExampleSummary]:
    """Return bundled scenario examples."""
    return get_example_scenarios()


@app.get(
    "/scenarios/examples/{example_id}",
    response_model=NormalizedScenario,
    responses={
        status.HTTP_404_NOT_FOUND: {
            "model": ErrorResponse,
            "description": "The requested scenario example does not exist.",
        }
    },
)
def load_scenario_example(example_id: str) -> NormalizedScenario | JSONResponse:
    """Return a normalized bundled scenario example."""
    try:
        return get_example_scenario(example_id)
    except ScenarioLoadError as exc:
        return _error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="scenario_example_not_found",
            message=str(exc),
        )


@app.post(
    "/scenarios/normalize",
    response_model=NormalizedScenario,
    responses={
        status.HTTP_400_BAD_REQUEST: {
            "model": ErrorResponse,
            "description": "The submitted scenario source cannot be normalized.",
        }
    },
)
def normalize_scenario(
    request: ScenarioNormalizeRequest,
) -> NormalizedScenario | JSONResponse:
    """Normalize submitted scenario source data."""
    try:
        return run_scenario_normalization(request)
    except ScenarioLoadError as exc:
        return _error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="scenario_normalization_failed",
            message=str(exc),
        )


@app.post(
    "/propagate/tle",
    response_model=TlePropagationResponse,
    responses={
        status.HTTP_400_BAD_REQUEST: {
            "model": ErrorResponse,
            "description": "The TLE payload is syntactically valid JSON but cannot be propagated.",
        },
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": ErrorResponse,
            "description": "Orekit runtime or required data is unavailable.",
        }
    },
)
def propagate_tle(request: TlePropagationRequest) -> TlePropagationResponse | JSONResponse:
    """Propagate a TLE request with Orekit and map operational errors to HTTP."""
    try:
        return run_tle_propagation(request)
    except OrekitRuntimeError as exc:
        return _error_response(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="orekit_unavailable",
            message=str(exc),
        )
    except TlePropagationError as exc:
        return _error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="tle_propagation_failed",
            message=str(exc),
        )


def _error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
            }
        },
    )


def main() -> None:
    import uvicorn

    uvicorn.run("orb_lab.api:app", host="127.0.0.1", port=8000, reload=True)
