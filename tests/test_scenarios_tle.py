from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from orb_lab.api import app
from orb_lab.scenarios import (
    ScenarioLoadError,
    list_example_scenarios,
    load_example_scenario,
    normalize_tle_text,
    tle_input_from_scenario,
)

ISS_TLE_TEXT = """ISS (ZARYA)
1 25544U 98067A   24173.56347222  .00020137  00000+0  35155-3 0  9993
2 25544  51.6390 336.0970 0007833  50.2065  79.8843 15.50417852458913
"""


def test_normalize_tle_text_accepts_name_plus_two_lines() -> None:
    scenario = normalize_tle_text(ISS_TLE_TEXT)

    assert scenario.id is None
    assert scenario.name == "ISS (ZARYA)"
    assert scenario.source.type == "tle"
    assert scenario.source.format == "tle"
    assert scenario.source.object_id == "25544"
    assert scenario.source.raw == ISS_TLE_TEXT.strip()
    assert scenario.frame.name == "TEME"
    assert scenario.frame.origin == "geocentric"
    assert scenario.tle is not None
    assert scenario.tle.line1.startswith("1 25544U")


def test_normalize_tle_text_accepts_two_lines_with_explicit_name() -> None:
    scenario = normalize_tle_text("\n".join(ISS_TLE_TEXT.splitlines()[1:]), name="Station")

    assert scenario.name == "Station"
    assert scenario.source.object_id == "25544"


def test_normalize_tle_text_uses_object_id_when_name_missing() -> None:
    scenario = normalize_tle_text("\n".join(ISS_TLE_TEXT.splitlines()[1:]))

    assert scenario.name == "TLE 25544"


@pytest.mark.parametrize(
    "text",
    [
        "ISS only",
        "\n".join(["name", "line a", "line b", "line c"]),
    ],
)
def test_normalize_tle_text_rejects_invalid_line_counts(text: str) -> None:
    with pytest.raises(ScenarioLoadError, match="line 1 and line 2"):
        normalize_tle_text(text)


def test_normalize_tle_text_rejects_malformed_prefix() -> None:
    text = """ISS
2 25544 wrong first line
1 25544 wrong second line
"""

    with pytest.raises(ScenarioLoadError, match="Invalid TLE scenario text"):
        normalize_tle_text(text)


def test_example_scenario_list_and_load() -> None:
    examples = list_example_scenarios()

    assert examples[0].id == "iss-tle"
    assert examples[0].source_type == "tle"

    scenario = load_example_scenario("iss-tle")

    assert scenario.id == "iss-tle"
    assert scenario.name == "ISS (ZARYA)"
    assert scenario.tle is not None


def test_load_example_scenario_rejects_unknown_id() -> None:
    with pytest.raises(ScenarioLoadError, match="Unknown scenario example"):
        load_example_scenario("missing")


def test_tle_input_from_scenario_returns_existing_propagation_shape() -> None:
    scenario = normalize_tle_text(ISS_TLE_TEXT)

    tle = tle_input_from_scenario(scenario)

    assert tle.name == "ISS (ZARYA)"
    assert tle.line1.startswith("1 25544U")


def test_tle_input_from_scenario_rejects_non_tle() -> None:
    scenario = normalize_tle_text(ISS_TLE_TEXT)
    scenario.source.type = "initial_state"

    with pytest.raises(ScenarioLoadError, match="does not contain TLE"):
        tle_input_from_scenario(scenario)


def test_scenarios_examples_route_lists_examples() -> None:
    client = TestClient(app)

    response = client.get("/scenarios/examples")

    assert response.status_code == 200
    assert response.json()[0] == {
        "id": "iss-tle",
        "name": "ISS (ZARYA)",
        "source_type": "tle",
        "format": "tle",
        "frame": "TEME",
    }


def test_scenarios_example_route_returns_normalized_example() -> None:
    client = TestClient(app)

    response = client.get("/scenarios/examples/iss-tle")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "iss-tle"
    assert body["source"]["type"] == "tle"
    assert body["frame"] == {"name": "TEME", "origin": "geocentric"}
    assert body["tle"]["line1"].startswith("1 25544U")


def test_scenarios_example_route_rejects_unknown_id() -> None:
    client = TestClient(app)

    response = client.get("/scenarios/examples/missing")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "scenario_example_not_found"


def test_scenarios_normalize_route_accepts_tle_text() -> None:
    client = TestClient(app)

    response = client.post(
        "/scenarios/normalize",
        json={
            "source_type": "tle",
            "text": ISS_TLE_TEXT,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "ISS (ZARYA)"
    assert body["source"]["object_id"] == "25544"


def test_scenarios_normalize_route_rejects_invalid_tle_text() -> None:
    client = TestClient(app)

    response = client.post(
        "/scenarios/normalize",
        json={
            "source_type": "tle",
            "text": "ISS only",
        },
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "scenario_normalization_failed"
