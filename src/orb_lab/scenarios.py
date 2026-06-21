from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from tempfile import NamedTemporaryFile

from pydantic import ValidationError

from orb_lab.models import (
    NormalizedScenario,
    ScenarioExampleSummary,
    ScenarioFrame,
    ScenarioFrameMetadata,
    ScenarioInitialStateInput,
    ScenarioNormalizeRequest,
    ScenarioSourceMetadata,
    ScenarioStateVector,
    ScenarioTleData,
    TleInput,
)
from orb_lab.orekit_runtime import ensure_orekit_data

EXAMPLES_DIR = Path(__file__).resolve().parents[2] / "examples" / "scenarios"
ISS_EXAMPLE_ID = "iss-tle"
ISS_OEM_EXAMPLE_ID = "iss-oem"
MANUAL_INITIAL_STATE_EXAMPLE_ID = "manual-initial-state"
M_TO_KM = 1.0 / 1000.0


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
        ),
        ScenarioExampleSummary(
            id=ISS_OEM_EXAMPLE_ID,
            name="ISS OEM sample",
            source_type="oem_ccsds",
            format="ccsds-oem",
            frame="EME2000",
        ),
        ScenarioExampleSummary(
            id=MANUAL_INITIAL_STATE_EXAMPLE_ID,
            name="Manual EME2000 state",
            source_type="initial_state",
            format="json",
            frame="EME2000",
        ),
    ]


def load_example_scenario(example_id: str) -> NormalizedScenario:
    """Load and normalize a bundled example scenario."""
    if example_id == ISS_EXAMPLE_ID:
        return normalize_tle_text(_read_example_text("iss.tle"), scenario_id=ISS_EXAMPLE_ID)

    if example_id == ISS_OEM_EXAMPLE_ID:
        return normalize_oem_text(
            _read_example_text("iss.oem"),
            scenario_id=ISS_OEM_EXAMPLE_ID,
        )

    if example_id == MANUAL_INITIAL_STATE_EXAMPLE_ID:
        return normalize_initial_state_text(
            _read_example_text("manual-initial-state.json"),
            scenario_id=MANUAL_INITIAL_STATE_EXAMPLE_ID,
        )

    msg = f"Unknown scenario example: {example_id}"
    raise ScenarioLoadError(msg)


def normalize_scenario(request: ScenarioNormalizeRequest) -> NormalizedScenario:
    """Normalize submitted scenario source data."""
    if request.source_type == "tle":
        return normalize_tle_text(request.text, name=request.name)

    if request.source_type == "oem_ccsds":
        return normalize_oem_text(request.text, name=request.name)

    if request.source_type == "initial_state":
        return normalize_initial_state_text(request.text, name=request.name)

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


def normalize_oem_text(
    text: str,
    *,
    name: str | None = None,
    scenario_id: str | None = None,
) -> NormalizedScenario:
    """Normalize a CCSDS OEM text message into a sampled scenario."""
    if not text.strip():
        msg = "OEM scenario text is empty."
        raise ScenarioLoadError(msg)

    ensure_orekit_data()

    try:
        from java.io import File
        from orekit_jpype.pyhelpers import absolutedate_to_datetime
        from org.orekit.data import DataSource
        from org.orekit.files.ccsds.ndm import ParserBuilder
    except Exception as exc:
        msg = "Orekit CCSDS parser support is required for OEM scenarios."
        raise ScenarioLoadError(msg) from exc

    try:
        with NamedTemporaryFile("w", suffix=".oem", encoding="utf-8", delete=False) as handle:
            handle.write(text)
            path = Path(handle.name)

        try:
            data_source = DataSource(File(str(path)))
            oem = ParserBuilder().buildOemParser().parseMessage(data_source)
        finally:
            path.unlink(missing_ok=True)
    except Exception as exc:
        msg = "Invalid or unsupported OEM scenario text."
        raise ScenarioLoadError(msg) from exc

    segments = list(oem.getSegments())
    if len(segments) != 1:
        msg = "OEM scenarios must contain exactly one segment in Goal 05."
        raise ScenarioLoadError(msg)

    segment = segments[0]
    metadata = segment.getMetadata()
    frame_name = _map_oem_frame(str(metadata.getFrame().getName()))
    coordinates = list(segment.getData().getCoordinates())

    if not coordinates:
        msg = "OEM scenario contains no coordinates."
        raise ScenarioLoadError(msg)

    samples = [
        ScenarioStateVector(
            epoch=_ensure_utc(absolutedate_to_datetime(coordinate.getDate())),
            position_km=_vector_to_km_tuple(coordinate.getPosition()),
            velocity_km_s=_vector_to_km_tuple(coordinate.getVelocity()),
        )
        for coordinate in coordinates
    ]
    object_name = str(metadata.getObjectName()) if metadata.getObjectName() else None
    object_id = str(metadata.getObjectID()) if metadata.getObjectID() else None
    scenario_name = name or object_name or object_id or "OEM scenario"

    return NormalizedScenario(
        id=scenario_id,
        name=scenario_name,
        source=ScenarioSourceMetadata(
            type="oem_ccsds",
            format="ccsds-oem",
            object_id=object_id,
            raw=text.strip(),
        ),
        frame=ScenarioFrameMetadata(name=frame_name, origin="geocentric"),
        epoch=samples[0].epoch,
        samples=samples,
    )


def normalize_initial_state_text(
    text: str,
    *,
    name: str | None = None,
    scenario_id: str | None = None,
) -> NormalizedScenario:
    """Normalize a hand-authored initial-state JSON document."""
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        msg = "Initial-state scenario text must be valid JSON."
        raise ScenarioLoadError(msg) from exc

    if not isinstance(payload, dict):
        msg = "Initial-state scenario JSON must be an object."
        raise ScenarioLoadError(msg)

    try:
        initial_state = ScenarioInitialStateInput.model_validate(payload)
    except ValidationError as exc:
        msg = "Invalid initial-state scenario JSON."
        raise ScenarioLoadError(msg) from exc

    state = ScenarioStateVector(
        epoch=initial_state.epoch,
        position_km=_initial_position_km(initial_state),
        velocity_km_s=_initial_velocity_km_s(initial_state),
    )
    scenario_name = name or initial_state.name or "Manual initial state"

    return NormalizedScenario(
        id=scenario_id,
        name=scenario_name,
        source=ScenarioSourceMetadata(
            type="initial_state",
            format="json",
            object_id=initial_state.object_id,
            raw=json.dumps(payload, indent=2, sort_keys=True),
        ),
        frame=ScenarioFrameMetadata(
            name=initial_state.frame,
            origin=initial_state.origin,
        ),
        epoch=state.epoch,
        initial_state=state,
        samples=[state],
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


def _map_oem_frame(frame_name: str) -> ScenarioFrame:
    supported = {
        "TEME": "TEME",
        "EME2000": "EME2000",
        "ITRF": "ITRF",
    }

    if frame_name in supported:
        return supported[frame_name]

    msg = f"Unsupported OEM frame: {frame_name}"
    raise ScenarioLoadError(msg)


def _vector_to_km_tuple(vector: object) -> tuple[float, float, float]:
    return (
        float(vector.getX()) * M_TO_KM,
        float(vector.getY()) * M_TO_KM,
        float(vector.getZ()) * M_TO_KM,
    )


def _initial_position_km(
    initial_state: ScenarioInitialStateInput,
) -> tuple[float, float, float]:
    if initial_state.position_km is not None:
        return initial_state.position_km

    if initial_state.position_m is not None:
        return _scale_tuple(initial_state.position_m, M_TO_KM)

    if initial_state.position is not None:
        factor = M_TO_KM if initial_state.units.position == "m" else 1.0
        return _scale_tuple(initial_state.position, factor)

    msg = "Initial-state scenario is missing a position vector."
    raise ScenarioLoadError(msg)


def _initial_velocity_km_s(
    initial_state: ScenarioInitialStateInput,
) -> tuple[float, float, float]:
    if initial_state.velocity_km_s is not None:
        return initial_state.velocity_km_s

    if initial_state.velocity_m_s is not None:
        return _scale_tuple(initial_state.velocity_m_s, M_TO_KM)

    if initial_state.velocity is not None:
        factor = M_TO_KM if initial_state.units.velocity == "m/s" else 1.0
        return _scale_tuple(initial_state.velocity, factor)

    msg = "Initial-state scenario is missing a velocity vector."
    raise ScenarioLoadError(msg)


def _scale_tuple(vector: tuple[float, float, float], factor: float) -> tuple[float, float, float]:
    return (
        vector[0] * factor,
        vector[1] * factor,
        vector[2] * factor,
    )


def _ensure_utc(epoch: datetime) -> datetime:
    if epoch.tzinfo is None or epoch.utcoffset() is None:
        return epoch.replace(tzinfo=UTC)
    return epoch.astimezone(UTC)
