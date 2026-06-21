from __future__ import annotations

import os
from pathlib import Path

import pytest

from orb_lab.ephemeris_products import EphemerisProductError, inspect_oem_file

FIXTURE = Path("tests/fixtures/orb-sat-1-minimal.oem")


@pytest.mark.skipif(
    not os.environ.get("OREKIT_DATA_PATH"),
    reason="OREKIT_DATA_PATH is required for live Orekit OEM parsing.",
)
def test_inspect_oem_file_extracts_metadata_and_samples() -> None:
    summary = inspect_oem_file(FIXTURE)

    assert summary.object_name == "ORB-SAT-1"
    assert summary.object_id == "2026-001A"
    assert summary.center_name == "EARTH"
    assert summary.frame_name == "EME2000"
    assert summary.time_system == "UTC"
    assert summary.interpolation_method == "LAGRANGE"
    assert summary.interpolation_degree == 1
    assert summary.sample_count == 3
    assert summary.start_time.isoformat() == "2026-06-20T00:00:00+00:00"
    assert summary.stop_time.isoformat() == "2026-06-20T00:20:00+00:00"
    assert summary.samples[0].epoch.isoformat() == "2026-06-20T00:00:00+00:00"
    assert summary.samples[0].position_km == pytest.approx((7000.0, 0.0, 0.0))
    assert summary.samples[0].velocity_km_s == pytest.approx((0.0, 7.5, 1.0))


def test_inspect_oem_file_reports_missing_file() -> None:
    with pytest.raises(EphemerisProductError, match="does not exist"):
        inspect_oem_file(Path("tests/fixtures/missing.oem"))
