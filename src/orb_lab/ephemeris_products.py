from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from orb_lab.orekit_runtime import OrekitRuntimeError, ensure_orekit_data

M_TO_KM = 1.0 / 1000.0


class EphemerisProductError(RuntimeError):
    """Raised when an external ephemeris product cannot be inspected."""


@dataclass(frozen=True)
class OemSample:
    epoch: datetime
    position_km: tuple[float, float, float]
    velocity_km_s: tuple[float, float, float]


@dataclass(frozen=True)
class OemSegmentSummary:
    object_name: str
    object_id: str
    center_name: str
    frame_name: str
    time_system: str
    interpolation_method: str | None
    interpolation_degree: int | None
    start_time: datetime
    stop_time: datetime
    sample_count: int
    samples: tuple[OemSample, ...]


def inspect_oem_file(path: Path | str) -> OemSegmentSummary:
    """Parse a CCSDS OEM file with Orekit and normalize the first segment."""
    source_path = Path(path)
    if not source_path.exists():
        msg = f"OEM file does not exist: {source_path}"
        raise EphemerisProductError(msg)

    try:
        ensure_orekit_data()
    except OrekitRuntimeError:
        raise

    try:
        from java.io import File
        from orekit_jpype.pyhelpers import absolutedate_to_datetime
        from org.orekit.data import DataSource
        from org.orekit.files.ccsds.ndm import ParserBuilder
    except Exception as exc:  # pragma: no cover - depends on wrapper state
        msg = "Orekit CCSDS OEM parser classes are not importable."
        raise EphemerisProductError(msg) from exc

    try:
        oem = ParserBuilder().buildOemParser().parse(
            DataSource(File(str(source_path.resolve())))
        )
        segments = oem.getSegments()
        if segments.isEmpty():
            msg = "OEM file contains no ephemeris segments."
            raise EphemerisProductError(msg)
        segment = segments.get(0)
        metadata = segment.getMetadata()
        coordinates = segment.getData().getCoordinates()
    except EphemerisProductError:
        raise
    except Exception as exc:
        msg = "Orekit failed to parse OEM file."
        raise EphemerisProductError(msg) from exc

    samples = tuple(
        OemSample(
            epoch=_as_utc(absolutedate_to_datetime(coordinate.getDate())),
            position_km=_vector_to_km_tuple(coordinate.getPosition()),
            velocity_km_s=_vector_to_km_tuple(coordinate.getVelocity()),
        )
        for coordinate in coordinates
    )

    interpolation_method = metadata.getInterpolationMethod()
    interpolation_degree = metadata.getInterpolationDegree()

    return OemSegmentSummary(
        object_name=str(metadata.getObjectName()),
        object_id=str(metadata.getObjectID()),
        center_name=str(metadata.getCenter().getName()),
        frame_name=str(metadata.getReferenceFrame().getName()),
        time_system=str(metadata.getTimeSystem()),
        interpolation_method=(
            None if interpolation_method is None else str(interpolation_method)
        ),
        interpolation_degree=(
            None if interpolation_degree is None else int(interpolation_degree)
        ),
        start_time=_as_utc(absolutedate_to_datetime(metadata.getStartTime())),
        stop_time=_as_utc(absolutedate_to_datetime(metadata.getStopTime())),
        sample_count=len(samples),
        samples=samples,
    )


def _vector_to_km_tuple(vector: object) -> tuple[float, float, float]:
    return (
        float(vector.getX()) * M_TO_KM,
        float(vector.getY()) * M_TO_KM,
        float(vector.getZ()) * M_TO_KM,
    )


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=UTC)

    return value.astimezone(UTC)
