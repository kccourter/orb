from __future__ import annotations

from datetime import datetime
from typing import Literal

import numpy as np
from pydantic import BaseModel, Field, field_validator, model_validator

Vector3 = tuple[float, float, float]
PropagationFrameRequest = Literal["native", "TEME", "EME2000", "ITRF", "QSW"]
FrameOrigin = Literal["geocentric", "spacecraft"]
UncertaintyProvenance = Literal[
    "published_reference",
    "derived",
    "synthetic",
    "calibrated_reference",
    "imported",
]
CovarianceType = Literal["position_3x3"]


class TleInput(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    line1: str = Field(min_length=1, max_length=120)
    line2: str = Field(min_length=1, max_length=120)

    @field_validator("line1")
    @classmethod
    def validate_line1(cls, line1: str) -> str:
        line = line1.strip()
        if not line.startswith("1 "):
            msg = "TLE line1 must start with '1 '."
            raise ValueError(msg)
        return line

    @field_validator("line2")
    @classmethod
    def validate_line2(cls, line2: str) -> str:
        line = line2.strip()
        if not line.startswith("2 "):
            msg = "TLE line2 must start with '2 '."
            raise ValueError(msg)
        return line


class SamplingRequest(BaseModel):
    start_epoch: datetime
    duration_minutes: float = Field(ge=10, le=360)
    step_seconds: int = Field(ge=5, le=300)

    @field_validator("start_epoch")
    @classmethod
    def require_timezone(cls, start_epoch: datetime) -> datetime:
        if start_epoch.tzinfo is None or start_epoch.utcoffset() is None:
            msg = "start_epoch must include a UTC offset."
            raise ValueError(msg)
        return start_epoch


class TlePropagationRequest(BaseModel):
    tle: TleInput
    sampling: SamplingRequest
    frame: PropagationFrameRequest = "native"


class SourceMetadata(BaseModel):
    type: Literal["tle"] = "tle"
    name: str | None = None
    propagator: str = "orekit-tle"


class FrameMetadata(BaseModel):
    name: str
    authority: str = "orekit"
    is_native: bool = True
    requested: PropagationFrameRequest | None = None
    source: str | None = None
    origin: FrameOrigin = "geocentric"


class UnitsMetadata(BaseModel):
    position: Literal["km"] = "km"
    velocity: Literal["km/s"] = "km/s"


class SamplingMetadata(BaseModel):
    start_epoch: datetime
    duration_minutes: float
    step_seconds: int
    sample_count: int = Field(ge=0)


class PropagationSample(BaseModel):
    epoch: datetime
    position_km: Vector3
    velocity_km_s: Vector3


class TlePropagationResponse(BaseModel):
    source: SourceMetadata
    frame: FrameMetadata
    units: UnitsMetadata = Field(default_factory=UnitsMetadata)
    sampling: SamplingMetadata
    samples: list[PropagationSample] = Field(default_factory=list)


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail


class UncertaintySourceMetadata(BaseModel):
    type: str = Field(min_length=1, max_length=80)
    provenance: UncertaintyProvenance
    description: str | None = Field(default=None, max_length=500)


class CovarianceFrameMetadata(BaseModel):
    name: str
    origin: FrameOrigin
    reference: str = Field(default="nominal_state", min_length=1, max_length=120)

    @field_validator("name")
    @classmethod
    def validate_name(cls, name: str) -> str:
        normalized = name.strip().upper()
        if normalized == "RSW":
            return "QSW"
        if normalized not in {"QSW", "TEME", "EME2000", "ITRF"}:
            msg = "Covariance frame must be one of QSW, TEME, EME2000, or ITRF."
            raise ValueError(msg)
        return normalized

    @model_validator(mode="after")
    def validate_origin(self) -> CovarianceFrameMetadata:
        if self.name == "QSW" and self.origin != "spacecraft":
            msg = "QSW covariance frame must use spacecraft origin."
            raise ValueError(msg)
        if self.name in {"TEME", "EME2000", "ITRF"} and self.origin != "geocentric":
            msg = f"{self.name} covariance frame must use geocentric origin."
            raise ValueError(msg)
        return self


class UncertaintyUnitsMetadata(BaseModel):
    position: Literal["km"] = "km"
    position_covariance: Literal["km^2"] = "km^2"


class CovarianceSample(BaseModel):
    epoch: datetime
    covariance_type: CovarianceType = "position_3x3"
    covariance_sigma: Literal[1] = 1
    position_covariance: list[list[float]]
    provenance: UncertaintyProvenance
    confidence_label: str | None = Field(default=None, max_length=120)

    @field_validator("epoch")
    @classmethod
    def require_timezone(cls, epoch: datetime) -> datetime:
        if epoch.tzinfo is None or epoch.utcoffset() is None:
            msg = "covariance sample epoch must include a UTC offset."
            raise ValueError(msg)
        return epoch

    @model_validator(mode="after")
    def validate_position_covariance(self) -> CovarianceSample:
        matrix = self.position_covariance
        if len(matrix) != 3 or any(len(row) != 3 for row in matrix):
            msg = "position_3x3 covariance must be a 3x3 matrix."
            raise ValueError(msg)

        covariance = np.array(matrix, dtype=float)
        if not np.all(np.isfinite(covariance)):
            msg = "position_3x3 covariance entries must be finite numbers."
            raise ValueError(msg)
        if np.any(np.diag(covariance) < 0.0):
            msg = "position_3x3 covariance diagonal entries must be nonnegative."
            raise ValueError(msg)
        if not np.allclose(covariance, covariance.T, rtol=0.0, atol=1e-12):
            msg = "position_3x3 covariance must be symmetric."
            raise ValueError(msg)

        eigenvalues = np.linalg.eigvalsh(covariance)
        if np.min(eigenvalues) < -1e-12:
            msg = "position_3x3 covariance must be positive semidefinite."
            raise ValueError(msg)
        return self


class CovarianceSeries(BaseModel):
    object_id: str = Field(min_length=1, max_length=120)
    series_id: str = Field(min_length=1, max_length=160)
    source: UncertaintySourceMetadata
    frame: CovarianceFrameMetadata
    units: UncertaintyUnitsMetadata = Field(default_factory=UncertaintyUnitsMetadata)
    samples: list[CovarianceSample] = Field(min_length=1)


class DemoStateVector(BaseModel):
    epoch: datetime
    frame: str = "EME2000"
    position_km: Vector3
    velocity_km_s: Vector3


class DemoPropagationSample(BaseModel):
    source: str
    samples: list[DemoStateVector] = Field(default_factory=list)
