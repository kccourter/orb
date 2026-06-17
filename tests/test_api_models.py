from __future__ import annotations

from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from orb_lab.api import app
from orb_lab.models import TlePropagationRequest

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


def test_tle_propagation_request_accepts_goal_01_defaults() -> None:
    request = TlePropagationRequest.model_validate(ISS_TLE_PAYLOAD)

    assert request.tle.name == "ISS (ZARYA)"
    assert request.tle.line1.startswith("1 25544U")
    assert request.tle.line2.startswith("2 25544")
    assert request.sampling.start_epoch.isoformat() == "2024-06-21T13:31:24+00:00"
    assert request.sampling.duration_minutes == 92.5
    assert request.sampling.step_seconds == 30
    assert request.frame == "native"


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("duration_minutes", 9.9),
        ("duration_minutes", 360.1),
        ("step_seconds", 4),
        ("step_seconds", 301),
    ],
)
def test_tle_propagation_request_rejects_sampling_out_of_range(
    field: str,
    value: float,
) -> None:
    payload = ISS_TLE_PAYLOAD | {
        "sampling": ISS_TLE_PAYLOAD["sampling"] | {field: value}
    }

    with pytest.raises(ValidationError):
        TlePropagationRequest.model_validate(payload)


@pytest.mark.parametrize(
    ("line_key", "value"),
    [
        ("line1", "2 25544 wrong line number"),
        ("line2", "1 25544 wrong line number"),
    ],
)
def test_tle_propagation_request_rejects_malformed_tle_lines(
    line_key: str,
    value: str,
) -> None:
    payload = ISS_TLE_PAYLOAD | {"tle": ISS_TLE_PAYLOAD["tle"] | {line_key: value}}

    with pytest.raises(ValidationError):
        TlePropagationRequest.model_validate(payload)


def test_tle_propagation_request_rejects_naive_epoch() -> None:
    payload = ISS_TLE_PAYLOAD | {
        "sampling": ISS_TLE_PAYLOAD["sampling"]
        | {"start_epoch": datetime(2024, 6, 21, 13, 31, 24)}
    }

    with pytest.raises(ValidationError):
        TlePropagationRequest.model_validate(payload)


def test_propagate_tle_route_rejects_invalid_payload_before_adapter() -> None:
    client = TestClient(app)
    payload = ISS_TLE_PAYLOAD | {"frame": "EME2000"}

    response = client.post("/propagate/tle", json=payload)

    assert response.status_code == 422


def test_existing_demo_route_still_returns_samples() -> None:
    client = TestClient(app)

    response = client.get("/propagate/demo", params={"minutes": 1, "step_seconds": 10})

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "demo-circular-placeholder"
    assert len(body["samples"]) == 7
