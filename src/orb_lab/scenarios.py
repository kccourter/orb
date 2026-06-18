from __future__ import annotations

from pathlib import Path

from orb_lab.models import (
    NormalizedScenario,
    ScenarioExampleSummary,
    ScenarioFrameMetadata,
    ScenarioNormalizeRequest,
    ScenarioSourceMetadata,
    ScenarioTleData,
    TleInput,
)

EXAMPLES_DIR = Path(__file__).resolve().parents[2] / "examples" / "scenarios"
ISS_EXAMPLE_ID = "iss-tle"


class ScenarioLoadError(RuntimeError):
    """Raised when scenario source data cannot be normalized."""


def list_example_scenarios() -> list[ScenarioExampleSummary]:
    """Return bundled scenario examples available to the frontend."""
    return [
        ScenarioExampleSummary(
            id=ISS_EXAMPLE_ID,
            name="ISS (ZARYA)",
            source_type="tle",
            format="tle",
            frame="TEME",
        )
    ]


def load_example_scenario(example_id: str) -> NormalizedScenario:
    """Load and normalize a bundled example scenario."""
    if example_id != ISS_EXAMPLE_ID:
        msg = f"Unknown scenario example: {example_id}"
        raise ScenarioLoadError(msg)

    return normalize_tle_text(_read_example_text("iss.tle"), scenario_id=ISS_EXAMPLE_ID)


def normalize_scenario(request: ScenarioNormalizeRequest) -> NormalizedScenario:
    """Normalize submitted scenario source data."""
    if request.source_type == "tle":
        return normalize_tle_text(request.text, name=request.name)

    msg = f"Unsupported scenario source type: {request.source_type}"
    raise ScenarioLoadError(msg)


def normalize_tle_text(
    text: str,
    *,
    name: str | None = None,
    scenario_id: str | None = None,
) -> NormalizedScenario:
    """Normalize two-line or name-plus-two-line TLE text into a scenario."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    if len(lines) == 2:
        tle_name = name
        line1, line2 = lines
    elif len(lines) == 3:
        tle_name = name or lines[0]
        line1, line2 = lines[1], lines[2]
    else:
        msg = "TLE scenarios must contain line 1 and line 2, with an optional name line."
        raise ScenarioLoadError(msg)

    try:
        tle = TleInput(name=tle_name, line1=line1, line2=line2)
    except ValueError as exc:
        msg = "Invalid TLE scenario text."
        raise ScenarioLoadError(msg) from exc

    object_id = _tle_object_id(tle.line1)
    scenario_name = tle.name or f"TLE {object_id}"

    return NormalizedScenario(
        id=scenario_id,
        name=scenario_name,
        source=ScenarioSourceMetadata(
            type="tle",
            format="tle",
            object_id=object_id,
            raw="\n".join(lines),
        ),
        frame=ScenarioFrameMetadata(name="TEME", origin="geocentric"),
        tle=ScenarioTleData(line1=tle.line1, line2=tle.line2),
    )


def tle_input_from_scenario(scenario: NormalizedScenario) -> TleInput:
    """Extract existing propagation TLE input from a normalized TLE scenario."""
    if scenario.source.type != "tle" or scenario.tle is None:
        msg = "Scenario does not contain TLE propagation input."
        raise ScenarioLoadError(msg)

    return TleInput(
        name=scenario.name,
        line1=scenario.tle.line1,
        line2=scenario.tle.line2,
    )


def _read_example_text(filename: str) -> str:
    path = EXAMPLES_DIR / filename

    try:
        return path.read_text(encoding="utf-8")
    except OSError as exc:
        msg = f"Scenario example is unavailable: {filename}"
        raise ScenarioLoadError(msg) from exc


def _tle_object_id(line1: str) -> str:
    return line1[2:7].strip() or "unknown"
