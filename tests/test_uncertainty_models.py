from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from orb_lab.models import CovarianceFrameMetadata, CovarianceSample, CovarianceSeries

FIXTURE_PATH = (
    Path(__file__).parents[1]
    / "docs/goals/06-uncertainty-and-intersections/fixtures/orb-sat-1.synthetic-covariance.json"
)


def load_fixture() -> dict:
    return json.loads(FIXTURE_PATH.read_text())


def test_orb_sat_1_synthetic_covariance_fixture_validates() -> None:
    series = CovarianceSeries.model_validate(load_fixture())

    assert series.object_id == "orb-sat-1"
    assert series.series_id == "orb-sat-1-synthetic-day3-qsw-v1"
    assert series.source.provenance == "synthetic"
    assert series.frame.name == "QSW"
    assert series.frame.origin == "spacecraft"
    assert series.units.position_covariance == "km^2"
    assert len(series.samples) == 6
    assert series.samples[-1].position_covariance == [
        [1.0, 0.0, 0.0],
        [0.0, 225.0, 0.0],
        [0.0, 0.0, 4.0],
    ]


def test_covariance_frame_normalizes_rsw_to_qsw() -> None:
    frame = CovarianceFrameMetadata.model_validate(
        {"name": "RSW", "origin": "spacecraft", "reference": "nominal_state"}
    )

    assert frame.name == "QSW"


@pytest.mark.parametrize("frame_name", ["ECI", "ECEF", "native"])
def test_covariance_frame_rejects_broad_or_unsupported_frame_labels(frame_name: str) -> None:
    with pytest.raises(ValidationError):
        CovarianceFrameMetadata.model_validate(
            {"name": frame_name, "origin": "geocentric", "reference": "nominal_state"}
        )


def test_covariance_frame_rejects_wrong_origin_for_qsw() -> None:
    with pytest.raises(ValidationError):
        CovarianceFrameMetadata.model_validate(
            {"name": "QSW", "origin": "geocentric", "reference": "nominal_state"}
        )


def test_covariance_sample_rejects_naive_epoch() -> None:
    with pytest.raises(ValidationError):
        CovarianceSample.model_validate(
            {
                "epoch": "2026-06-20T00:00:00",
                "covariance_type": "position_3x3",
                "covariance_sigma": 1,
                "position_covariance": [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
                "provenance": "synthetic",
            }
        )


@pytest.mark.parametrize(
    "position_covariance",
    [
        [[1.0, 0.0], [0.0, 1.0]],
        [[1.0, 0.1, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
        [[-1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
        [[1.0, 2.0, 0.0], [2.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
    ],
)
def test_covariance_sample_rejects_invalid_position_covariance(
    position_covariance: list[list[float]],
) -> None:
    with pytest.raises(ValidationError):
        CovarianceSample.model_validate(
            {
                "epoch": "2026-06-20T00:00:00Z",
                "covariance_type": "position_3x3",
                "covariance_sigma": 1,
                "position_covariance": position_covariance,
                "provenance": "synthetic",
            }
        )
