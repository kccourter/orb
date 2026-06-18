from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from orb_lab.api import app
from orb_lab.scenarios import (
    ScenarioLoadError,
    list_example_scenarios,
    load_example_scenario,
    normalize_initial_state_text,
)

INITIAL_STATE_TEXT = json.dumps(
    {
        "name": "Manual EME2000 state",
        "objectId": "manual-demo-001",
        "epoch": "2024-06-21T13:31:24Z",
        "frame": "EME2000",
        "origin": "geocentric",
        "positionKm": [7000.0, 0.0, 0.0],
        "velocityKmS": [0.0, 7.5, 0.0],
    }
)


def test_normalize_initial_state_text_accepts_km_state() -> None:
    scenario = normalize_initial_state_text(INITIAL_STATE_TEXT)

    assert scenario.id is None
    assert scenario.name == "Manual EME2000 state"
    assert scenario.source.type == "initial_state"
    assert scenario.source.format == "json"
    assert scenario.source.object_id == "manual-demo-001"
    assert scenario.frame.name == "EME2000"
    assert scenario.frame.origin == "geocentric"
    assert scenario.epoch is not None
    assert scenario.epoch.isoformat() == "2024-06-21T13:31:24+00:00"
    assert scenario.initial_state is not None
    assert scenario.initial_state.position_km == (7000.0, 0.0, 0.0)
    assert scenario.initial_state.velocity_km_s == (0.0, 7.5, 0.0)
    assert scenario.samples == [scenario.initial_state]


def test_normalize_initial_state_text_accepts_generic_meter_units() -> None:
    text = json.dumps(
        {
            "epoch": "2024-06-21T13:31:24+00:00",
            "frame": "ITRF",
            "units": {
                "position": "m",
                "velocity": "m/s",
            },
            "position": [7000000.0, 0.0, 0.0],
            "velocity": [0.0, 7500.0, 0.0],
        }
    )

    scenario = normalize_initial_state_text(text, name="Meter state")

    assert scenario.name == "Meter state"
    assert scenario.frame.name == "ITRF"
    assert scenario.initial_state is not None
    assert scenario.initial_state.position_km == (7000.0, 0.0, 0.0)
    assert scenario.initial_state.velocity_km_s == (0.0, 7.5, 0.0)


def test_initial_state_example_is_listed_and_loads() -> None:
    examples = list_example_scenarios()

    assert examples[-1].id == "manual-initial-state"
    assert examples[-1].source_type == "initial_state"

    scenario = load_example_scenario("manual-initial-state")

    assert scenario.id == "manual-initial-state"
    assert scenario.source.type == "initial_state"
    assert scenario.initial_state is not None


@pytest.mark.parametrize(
    ("text", "match"),
    [
        ("not json", "valid JSON"),
        ("[]", "must be an object"),
        (
            json.dumps(
                {
                    "epoch": "2024-06-21T13:31:24Z",
                    "frame": "ECI",
                    "positionKm": [7000.0, 0.0, 0.0],
                    "velocityKmS": [0.0, 7.5, 0.0],
                }
            ),
            "Invalid initial-state",
        ),
        (
            json.dumps(
                {
                    "epoch": "2024-06-21T13:31:24",
                    "frame": "EME2000",
                    "positionKm": [7000.0, 0.0, 0.0],
                    "velocityKmS": [0.0, 7.5, 0.0],
                }
            ),
            "Invalid initial-state",
        ),
        (
            json.dumps(
                {
                    "epoch": "2024-06-21T13:31:24Z",
                    "frame": "EME2000",
                    "units": {
                        "position": "mi",
                        "velocity": "km/s",
                    },
                    "position": [7000.0, 0.0, 0.0],
                    "velocity": [0.0, 7.5, 0.0],
                }
            ),
            "Invalid initial-state",
        ),
        (
            json.dumps(
                {
                    "epoch": "2024-06-21T13:31:24Z",
                    "frame": "EME2000",
                    "positionKm": [7000.0, 0.0, 0.0],
                }
            ),
            "Invalid initial-state",
        ),
    ],
)
def test_normalize_initial_state_text_rejects_invalid_input(
    text: str,
    match: str,
) -> None:
    with pytest.raises(ScenarioLoadError, match=match):
        normalize_initial_state_text(text)


def test_scenarios_example_route_returns_initial_state_example() -> None:
    client = TestClient(app)

    response = client.get("/scenarios/examples/manual-initial-state")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "manual-initial-state"
    assert body["source"]["type"] == "initial_state"
    assert body["frame"] == {"name": "EME2000", "origin": "geocentric"}
    assert body["initial_state"]["position_km"] == [7000.0, 0.0, 0.0]


def test_scenarios_normalize_route_accepts_initial_state_json() -> None:
    client = TestClient(app)

    response = client.post(
        "/scenarios/normalize",
        json={
            "source_type": "initial_state",
            "text": INITIAL_STATE_TEXT,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Manual EME2000 state"
    assert body["source"]["object_id"] == "manual-demo-001"
    assert body["initial_state"]["velocity_km_s"] == [0.0, 7.5, 0.0]


def test_scenarios_normalize_route_rejects_invalid_initial_state_json() -> None:
    client = TestClient(app)

    response = client.post(
        "/scenarios/normalize",
        json={
            "source_type": "initial_state",
            "text": "{}",
        },
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "scenario_normalization_failed"
