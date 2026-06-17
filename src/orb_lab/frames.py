from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from orb_lab.models import FrameOrigin, PropagationFrameRequest


class FrameResolutionError(RuntimeError):
    """Raised when an Orekit frame request cannot be resolved or transformed."""


@dataclass(frozen=True)
class ResolvedFrame:
    requested: PropagationFrameRequest
    name: str
    source: str
    origin: FrameOrigin
    is_native: bool
    orekit_frame: Any | None = None
    lof_type: Any | None = None


def resolve_output_frame(
    requested: PropagationFrameRequest,
    native_frame: Any,
) -> ResolvedFrame:
    """Resolve an API frame request to an Orekit target frame or local frame type."""
    native_name = str(native_frame.getName())

    if requested == "native":
        return ResolvedFrame(
            requested=requested,
            name=native_name,
            source=native_name,
            origin="geocentric",
            is_native=True,
            orekit_frame=native_frame,
        )

    try:
        from org.orekit.frames import FramesFactory, LOFType
        from org.orekit.utils import IERSConventions
    except Exception as exc:  # pragma: no cover - depends on wrapper state
        msg = "Orekit frame classes are not importable."
        raise FrameResolutionError(msg) from exc

    if requested == "TEME":
        return ResolvedFrame(
            requested=requested,
            name="TEME",
            source=native_name,
            origin="geocentric",
            is_native=False,
            orekit_frame=FramesFactory.getTEME(),
        )

    if requested == "EME2000":
        return ResolvedFrame(
            requested=requested,
            name="EME2000",
            source=native_name,
            origin="geocentric",
            is_native=False,
            orekit_frame=FramesFactory.getEME2000(),
        )

    if requested == "ITRF":
        return ResolvedFrame(
            requested=requested,
            name="ITRF",
            source=native_name,
            origin="geocentric",
            is_native=False,
            orekit_frame=FramesFactory.getITRF(IERSConventions.IERS_2010, True),
        )

    if requested == "QSW":
        return ResolvedFrame(
            requested=requested,
            name="QSW",
            source=native_name,
            origin="spacecraft",
            is_native=False,
            lof_type=LOFType.QSW,
        )

    msg = f"Unsupported propagation frame: {requested}"
    raise FrameResolutionError(msg)


def transform_pv_coordinates(
    pv_coordinates: Any,
    source_frame: Any,
    target: ResolvedFrame,
    absolute_date: Any,
) -> Any:
    """Transform PV coordinates into the resolved output frame."""
    if target.is_native:
        return pv_coordinates

    try:
        if target.orekit_frame is not None:
            transform = source_frame.getTransformTo(target.orekit_frame, absolute_date)
            return transform.transformPVCoordinates(pv_coordinates)

        if target.lof_type is not None:
            transform = target.lof_type.transformFromInertial(
                absolute_date,
                pv_coordinates,
            )
            return transform.transformPVCoordinates(pv_coordinates)
    except Exception as exc:
        msg = f"Failed to transform PV coordinates to {target.name}."
        raise FrameResolutionError(msg) from exc

    msg = f"Unsupported propagation frame: {target.requested}"
    raise FrameResolutionError(msg)
