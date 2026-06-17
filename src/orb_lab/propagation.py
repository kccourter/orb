from __future__ import annotations

from datetime import UTC, datetime
from math import floor, isfinite

from orb_lab.frames import (
    FrameResolutionError,
    ResolvedFrame,
    resolve_output_frame,
    transform_pv_coordinates,
)
from orb_lab.models import (
    FrameMetadata,
    PropagationSample,
    SamplingMetadata,
    SourceMetadata,
    TlePropagationRequest,
    TlePropagationResponse,
)
from orb_lab.orekit_runtime import OrekitRuntimeError, ensure_orekit_data

M_TO_KM = 1.0 / 1000.0


class TlePropagationError(RuntimeError):
    """Raised when an Orekit TLE request cannot produce sampled PV coordinates."""


def propagate_tle(request: TlePropagationRequest) -> TlePropagationResponse:
    """Propagate a TLE request with Orekit and return sampled PV vectors."""
    try:
        ensure_orekit_data()
    except OrekitRuntimeError:
        raise

    try:
        from orekit_jpype.pyhelpers import datetime_to_absolutedate
        from org.orekit.propagation.analytical.tle import TLE, TLEPropagator
    except Exception as exc:  # pragma: no cover - depends on wrapper state
        msg = "Orekit TLE classes are not importable."
        raise TlePropagationError(msg) from exc

    try:
        tle = TLE(request.tle.line1, request.tle.line2)
        propagator = TLEPropagator.selectExtrapolator(tle)
    except Exception as exc:
        msg = "Invalid or unsupported TLE."
        raise TlePropagationError(msg) from exc

    start_epoch = request.sampling.start_epoch.astimezone(UTC)
    duration_seconds = request.sampling.duration_minutes * 60.0
    sample_count = floor(duration_seconds / request.sampling.step_seconds) + 1
    source_frame = propagator.getFrame()
    target_frame = _resolve_frame(request, source_frame)
    samples: list[PropagationSample] = []

    for index in range(sample_count):
        epoch = _sample_epoch(
            start_epoch=start_epoch,
            offset_seconds=index * request.sampling.step_seconds,
        )
        absolute_date = datetime_to_absolutedate(epoch)

        try:
            state = propagator.propagate(absolute_date)
            pv_coordinates = transform_pv_coordinates(
                state.getPVCoordinates(),
                source_frame,
                target_frame,
                absolute_date,
            )
        except Exception as exc:
            msg = f"Orekit propagation failed at sample {index}."
            raise TlePropagationError(msg) from exc

        position_km = _vector_to_km_tuple(pv_coordinates.getPosition())
        velocity_km_s = _vector_to_km_tuple(pv_coordinates.getVelocity())
        _validate_finite_vector(position_km, "position_km", index)
        _validate_finite_vector(velocity_km_s, "velocity_km_s", index)

        samples.append(
            PropagationSample(
                epoch=epoch,
                position_km=position_km,
                velocity_km_s=velocity_km_s,
            )
        )

    return TlePropagationResponse(
        source=SourceMetadata(name=request.tle.name),
        frame=FrameMetadata(
            name=target_frame.name,
            is_native=target_frame.is_native,
            requested=target_frame.requested,
            source=target_frame.source,
            origin=target_frame.origin,
        ),
        sampling=SamplingMetadata(
            start_epoch=start_epoch,
            duration_minutes=request.sampling.duration_minutes,
            step_seconds=request.sampling.step_seconds,
            sample_count=len(samples),
        ),
        samples=samples,
    )


def _resolve_frame(request: TlePropagationRequest, source_frame: object) -> ResolvedFrame:
    try:
        return resolve_output_frame(request.frame, source_frame)
    except FrameResolutionError as exc:
        raise TlePropagationError(str(exc)) from exc


def _sample_epoch(start_epoch: datetime, offset_seconds: int) -> datetime:
    return datetime.fromtimestamp(start_epoch.timestamp() + offset_seconds, UTC)


def _vector_to_km_tuple(vector: object) -> tuple[float, float, float]:
    return (
        float(vector.getX()) * M_TO_KM,
        float(vector.getY()) * M_TO_KM,
        float(vector.getZ()) * M_TO_KM,
    )


def _validate_finite_vector(
    vector: tuple[float, float, float],
    field_name: str,
    sample_index: int,
) -> None:
    if not all(isfinite(component) for component in vector):
        msg = f"Non-finite {field_name} at sample {sample_index}."
        raise TlePropagationError(msg)
