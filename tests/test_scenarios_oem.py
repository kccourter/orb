from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from orb_lab.api import app
from orb_lab.orekit_runtime import OrekitRuntimeError
from orb_lab.scenarios import ScenarioLoadError, load_example_scenario, normalize_oem_text

OEM_TEXT = """CCSDS_OEM_VERS = 2.0
CREATION_DATE = 2024-06-21T13:31:24
ORIGINATOR = ORB LAB

META_START
OBJECT_NAME = ISS OEM SAMPLE
OBJECT_ID = 1998-067A
CENTER_NAME = EARTH
REF_FRAME = EME2000
TIME_SYSTEM = UTC
START_TIME = 2024-06-21T13:31:24
STOP_TIME = 2024-06-21T13:32:24
META_STOP

2024-06-21T13:31:24 7000 0 0 0 7.5 0
2024-06-21T13:32:24 6990 450 0 -0.5 7.49 0
"""


def test_oem_example_is_listed_without_parsing() -> None:
    client = TestClient(app)

    response = client.get("/scenarios/examples")

    assert response.status_code == 200
    assert {
        "id": "iss-oem",
        "name": "ISS OEM sample",
        "source_type": "oem_ccsds",
        "format": "ccsds-oem",
        "frame": "EME2000",
    } in response.json()


def test_normalize_oem_text_requires_orekit_data(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_data() -> None:
        msg = "OREKIT_DATA_PATH is required for OEM parsing."
        raise OrekitRuntimeError(msg)

    monkeypatch.setattr("orb_lab.scenarios.ensure_orekit_data", fail_data)

    with pytest.raises(OrekitRuntimeError, match="OREKIT_DATA_PATH"):
        normalize_oem_text(OEM_TEXT)


def test_scenarios_normalize_route_maps_oem_data_error_to_503(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_data() -> None:
        msg = "OREKIT_DATA_PATH is required for OEM parsing."
        raise OrekitRuntimeError(msg)

    monkeypatch.setattr("orb_lab.scenarios.ensure_orekit_data", fail_data)
    client = TestClient(app)

    response = client.post(
        "/scenarios/normalize",
        json={
            "source_type": "oem_ccsds",
            "text": OEM_TEXT,
        },
    )

    assert response.status_code == 503
    assert response.json() == {
        "error": {
            "code": "orekit_unavailable",
            "message": "OREKIT_DATA_PATH is required for OEM parsing.",
        }
    }


@pytest.mark.skipif(
    not os.environ.get("OREKIT_DATA_PATH"),
    reason="OREKIT_DATA_PATH is required for live Orekit OEM parsing.",
)
def test_normalize_oem_text_returns_samples() -> None:
    scenario = normalize_oem_text(OEM_TEXT)

    assert scenario.name == "ISS OEM SAMPLE"
    assert scenario.source.type == "oem_ccsds"
    assert scenario.source.format == "ccsds-oem"
    assert scenario.source.object_id == "1998-067A"
    assert scenario.frame.name == "EME2000"
    assert scenario.frame.origin == "geocentric"
    assert scenario.epoch is not None
    assert scenario.epoch.isoformat() == "2024-06-21T13:31:24+00:00"
    assert len(scenario.samples) == 2
    assert scenario.samples[0].position_km == (7000.0, 0.0, 0.0)
    assert scenario.samples[0].velocity_km_s == (0.0, 7.5, 0.0)


@pytest.mark.skipif(
    not os.environ.get("OREKIT_DATA_PATH"),
    reason="OREKIT_DATA_PATH is required for live Orekit OEM parsing.",
)
def test_load_oem_example_returns_normalized_scenario() -> None:
    scenario = load_example_scenario("iss-oem")

    assert scenario.id == "iss-oem"
    assert scenario.source.type == "oem_ccsds"
    assert len(scenario.samples) == 2


@pytest.mark.skipif(
    not os.environ.get("OREKIT_DATA_PATH"),
    reason="OREKIT_DATA_PATH is required for live Orekit OEM parsing.",
)
def test_scenarios_example_route_returns_oem_example() -> None:
    client = TestClient(app)

    response = client.get("/scenarios/examples/iss-oem")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "iss-oem"
    assert body["source"]["type"] == "oem_ccsds"
    assert body["frame"] == {"name": "EME2000", "origin": "geocentric"}
    assert len(body["samples"]) == 2


@pytest.mark.skipif(
    not os.environ.get("OREKIT_DATA_PATH"),
    reason="OREKIT_DATA_PATH is required for live Orekit OEM parsing.",
)
def test_scenarios_normalize_route_accepts_oem_text() -> None:
    client = TestClient(app)

    response = client.post(
        "/scenarios/normalize",
        json={
            "source_type": "oem_ccsds",
            "text": OEM_TEXT,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "ISS OEM SAMPLE"
    assert body["source"]["object_id"] == "1998-067A"
    assert len(body["samples"]) == 2


@pytest.mark.skipif(
    not os.environ.get("OREKIT_DATA_PATH"),
    reason="OREKIT_DATA_PATH is required for live Orekit OEM parsing.",
)
def test_normalize_oem_text_rejects_unsupported_frame() -> None:
    text = OEM_TEXT.replace("REF_FRAME = EME2000", "REF_FRAME = GCRF")

    with pytest.raises(ScenarioLoadError, match="Unsupported OEM frame"):
        normalize_oem_text(text)


@pytest.mark.skipif(
    not os.environ.get("OREKIT_DATA_PATH"),
    reason="OREKIT_DATA_PATH is required for live Orekit OEM parsing.",
)
def test_normalize_oem_text_rejects_invalid_syntax() -> None:
    with pytest.raises(ScenarioLoadError, match="Invalid or unsupported OEM"):
        normalize_oem_text("not an OEM")
