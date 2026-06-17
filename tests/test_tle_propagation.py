from __future__ import annotations

import os
from datetime import timedelta
from math import isfinite, sqrt

import pytest

from orb_lab.models import TlePropagationRequest
from orb_lab.orekit_runtime import OrekitRuntimeError
from orb_lab.propagation import TlePropagationError, propagate_tle

ISS_TLE_PAYLOAD = {
    "tle": {
        "name": "ISS (ZARYA)",
        "line1": "1 25544U 98067A   24173.56347222  .00020137  00000+0  35155-3 0  9993",
        "line2": "2 25544  51.6390 336.0970 0007833  50.2065  79.8843 15.50417852458913",
    },
    "sampling": {
        "start_epoch": "2024-06-21T13:31:24Z",
        "duration_minutes": 92.5,
        "step_seconds": 30,
    },
    "frame": "native",
}


def test_propagate_tle_requires_orekit_data(monkeypatch: pytest.MonkeyPatch) -> None:
    def fail_data() -> None:
        msg = "OREKIT_DATA_PATH is required for Orekit TLE propagation."
        raise OrekitRuntimeError(msg)

    monkeypatch.setattr("orb_lab.propagation.ensure_orekit_data", fail_data)
    request = TlePropagationRequest.model_validate(ISS_TLE_PAYLOAD)

    with pytest.raises(RuntimeError, match="OREKIT_DATA_PATH"):
        propagate_tle(request)


@pytest.mark.skipif(
    not os.environ.get("OREKIT_DATA_PATH"),
    reason="OREKIT_DATA_PATH is required for live Orekit TLE propagation.",
)
def test_propagate_tle_returns_goal_01_iss_samples() -> None:
    request = TlePropagationRequest.model_validate(ISS_TLE_PAYLOAD)

    response = propagate_tle(request)

    assert response.source.type == "tle"
    assert response.source.name == "ISS (ZARYA)"
    assert response.source.propagator == "orekit-tle"
    assert response.frame.authority == "orekit"
    assert response.frame.is_native is True
    assert response.frame.name
    assert response.units.position == "km"
    assert response.units.velocity == "km/s"
    assert response.sampling.sample_count == 186
    assert len(response.samples) == response.sampling.sample_count
    assert response.samples[0].epoch.isoformat() == "2024-06-21T13:31:24+00:00"
    assert response.samples[1].epoch - response.samples[0].epoch == timedelta(seconds=30)

    first = response.samples[0]
    position_norm_km = sqrt(sum(component * component for component in first.position_km))
    velocity_norm_km_s = sqrt(sum(component * component for component in first.velocity_km_s))

    assert 6500 < position_norm_km < 7500
    assert 7 < velocity_norm_km_s < 8
    assert all(
        isfinite(component)
        for sample in response.samples
        for component in sample.position_km
    )
    assert all(
        isfinite(component)
        for sample in response.samples
        for component in sample.velocity_km_s
    )


def test_validate_finite_vector_error_path() -> None:
    from orb_lab.propagation import _validate_finite_vector

    with pytest.raises(TlePropagationError, match="Non-finite position_km"):
        _validate_finite_vector((1.0, float("nan"), 3.0), "position_km", 0)
