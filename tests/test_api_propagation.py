from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from orb_lab.api import app
from orb_lab.models import (
    FrameMetadata,
    PropagationSample,
    SamplingMetadata,
    SourceMetadata,
    TlePropagationRequest,
    TlePropagationResponse,
)
from orb_lab.orekit_runtime import OrekitRuntimeError
from orb_lab.propagation import TlePropagationError

ISS_TLE_PAYLOAD = {
    "tle": {
        "name": "ISS (ZARYA)",
        "line1": "1 25544U 98067A   24173.56347222  .00020137  00000+0  35155-3 0  9993",
        "line2": "2 25544  51.6390 336.0970 0007833  50.2065  79.8843 15.50417852458913",
    },
    "sampling": {
        "start_epoch": "2024-06-21T13:31:24Z",
        "duration_minutes": 92.5,
        "step_seconds": 30,
    },
    "frame": "native",
}


def test_propagate_tle_route_returns_adapter_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_propagate(request: TlePropagationRequest) -> TlePropagationResponse:
        return TlePropagationResponse(
            source=SourceMetadata(name=request.tle.name),
            frame=FrameMetadata(name="TEME"),
            sampling=SamplingMetadata(
                start_epoch=request.sampling.start_epoch,
                duration_minutes=request.sampling.duration_minutes,
                step_seconds=request.sampling.step_seconds,
                sample_count=1,
            ),
            samples=[
                PropagationSample(
                    epoch=request.sampling.start_epoch,
                    position_km=(1.0, 2.0, 3.0),
                    velocity_km_s=(4.0, 5.0, 6.0),
                )
            ],
        )

    monkeypatch.setattr("orb_lab.api.run_tle_propagation", fake_propagate)
    client = TestClient(app)

    response = client.post("/propagate/tle", json=ISS_TLE_PAYLOAD)

    assert response.status_code == 200
    body = response.json()
    assert body["source"]["name"] == "ISS (ZARYA)"
    assert body["frame"]["name"] == "TEME"
    assert body["units"] == {"position": "km", "velocity": "km/s"}
    assert body["sampling"]["sample_count"] == 1
    assert body["samples"][0]["position_km"] == [1.0, 2.0, 3.0]


def test_propagate_tle_route_maps_runtime_error_to_503(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_runtime(_: TlePropagationRequest) -> TlePropagationResponse:
        msg = "OREKIT_DATA_PATH is required for Orekit TLE propagation."
        raise OrekitRuntimeError(msg)

    monkeypatch.setattr("orb_lab.api.run_tle_propagation", fail_runtime)
    client = TestClient(app)

    response = client.post("/propagate/tle", json=ISS_TLE_PAYLOAD)

    assert response.status_code == 503
    assert response.json() == {
        "error": {
            "code": "orekit_unavailable",
            "message": "OREKIT_DATA_PATH is required for Orekit TLE propagation.",
        }
    }


def test_propagate_tle_route_maps_domain_error_to_400(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_domain(_: TlePropagationRequest) -> TlePropagationResponse:
        msg = "Invalid or unsupported TLE."
        raise TlePropagationError(msg)

    monkeypatch.setattr("orb_lab.api.run_tle_propagation", fail_domain)
    client = TestClient(app)

    response = client.post("/propagate/tle", json=ISS_TLE_PAYLOAD)

    assert response.status_code == 400
    assert response.json() == {
        "error": {
            "code": "tle_propagation_failed",
            "message": "Invalid or unsupported TLE.",
        }
    }
