from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Vector3 = tuple[float, float, float]


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
    frame: Literal["native"] = "native"


class SourceMetadata(BaseModel):
    type: Literal["tle"] = "tle"
    name: str | None = None
    propagator: str = "orekit-tle"


class FrameMetadata(BaseModel):
    name: str
    authority: str = "orekit"
    is_native: bool = True


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


class DemoStateVector(BaseModel):
    epoch: datetime
    frame: str = "EME2000"
    position_km: Vector3
    velocity_km_s: Vector3


class DemoPropagationSample(BaseModel):
    source: str
    samples: list[DemoStateVector] = Field(default_factory=list)
