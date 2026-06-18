from __future__ import annotations

from datetime import datetime

import pytest
from pydantic import ValidationError

from orb_lab.models import NormalizedScenario


def test_normalized_scenario_accepts_minimal_tle() -> None:
    scenario = NormalizedScenario.model_validate(
        {
            "id": "iss",
            "name": "ISS",
            "source": {
                "type": "tle",
                "format": "tle",
                "object_id": "25544",
                "raw": (
                    "ISS\n"
                    "1 25544U 98067A   24173.56347222  .00020137  00000+0  35155-3 0  9993\n"
                    "2 25544  51.6390 336.0970 0007833  50.2065  79.8843 15.50417852458913"
                ),
            },
            "frame": {
                "name": "TEME",
                "origin": "geocentric",
            },
            "tle": {
                "line1": "1 25544U 98067A   24173.56347222  .00020137  00000+0  35155-3 0  9993",
                "line2": "2 25544  51.6390 336.0970 0007833  50.2065  79.8843 15.50417852458913",
            },
        }
    )

    assert scenario.source.type == "tle"
    assert scenario.frame.name == "TEME"
    assert scenario.frame.origin == "geocentric"
    assert scenario.units.position == "km"
    assert scenario.units.velocity == "km/s"
    assert scenario.tle is not None
    assert scenario.tle.line1.startswith("1 25544U")


def test_normalized_scenario_accepts_initial_state() -> None:
    scenario = NormalizedScenario.model_validate(
        {
            "name": "Manual EME2000 state",
            "source": {
                "type": "initial_state",
                "format": "json",
            },
            "frame": {
                "name": "EME2000",
                "origin": "geocentric",
            },
            "epoch": "2024-06-21T13:31:24Z",
            "initial_state": {
                "epoch": "2024-06-21T13:31:24Z",
                "position_km": [7000.0, 0.0, 0.0],
                "velocity_km_s": [0.0, 7.5, 0.0],
            },
        }
    )

    assert scenario.source.type == "initial_state"
    assert scenario.frame.name == "EME2000"
    assert scenario.epoch is not None
    assert scenario.epoch.isoformat() == "2024-06-21T13:31:24+00:00"
    assert scenario.initial_state is not None
    assert scenario.initial_state.position_km == (7000.0, 0.0, 0.0)


@pytest.mark.parametrize("frame", ["native", "ECI", "ECEF"])
def test_normalized_scenario_rejects_non_exact_frame_names(frame: str) -> None:
    with pytest.raises(ValidationError):
        NormalizedScenario.model_validate(
            {
                "name": "Bad frame",
                "source": {
                    "type": "initial_state",
                    "format": "json",
                },
                "frame": {
                    "name": frame,
                    "origin": "geocentric",
                },
            }
        )


def test_normalized_scenario_rejects_invalid_origin() -> None:
    with pytest.raises(ValidationError):
        NormalizedScenario.model_validate(
            {
                "name": "Bad origin",
                "source": {
                    "type": "initial_state",
                    "format": "json",
                },
                "frame": {
                    "name": "EME2000",
                    "origin": "heliocentric",
                },
            }
        )


def test_normalized_scenario_rejects_missing_source_metadata() -> None:
    with pytest.raises(ValidationError):
        NormalizedScenario.model_validate(
            {
                "name": "Missing source",
                "frame": {
                    "name": "TEME",
                    "origin": "geocentric",
                },
            }
        )


def test_normalized_scenario_rejects_naive_epoch() -> None:
    with pytest.raises(ValidationError):
        NormalizedScenario.model_validate(
            {
                "name": "Naive epoch",
                "source": {
                    "type": "initial_state",
                    "format": "json",
                },
                "frame": {
                    "name": "EME2000",
                    "origin": "geocentric",
                },
                "epoch": datetime(2024, 6, 21, 13, 31, 24),
            }
        )
