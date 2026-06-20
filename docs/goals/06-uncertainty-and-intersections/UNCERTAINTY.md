# Increment 2 Plan: Uncertainty Model and Covariance Strategy

## Objective

Define the smallest useful uncertainty model for ORB-SAT-1 from epoch through
day 3, while leaving a clean path to imported covariance products and later
intersection math.

This increment should add schema and fixtures only after approval. It should not
render ellipsoids yet and should not claim high-fidelity covariance realism.

## Recommended Direction

Use a **position covariance series** as the first implemented model:

- One uncertainty series belongs to one propagated object.
- Each sample has epoch, frame, units, covariance matrix, sigma semantics, and
  provenance.
- The first matrix shape is 3x3 position covariance in kilometers squared.
- The schema reserves a future path to 6x6 position-velocity covariance.
- The first covariance source is synthetic growth for ORB-SAT-1, explicitly
  marked as `synthetic`.

This keeps Increment 2 small enough to validate and useful enough for Increment
3 ellipsoid rendering and Increments 5-6 intersection probability.

## Proposed Schema Concepts

### Provenance

Every uncertainty series and sample should carry provenance:

- `published_reference`: value comes directly from a cited public source.
- `derived`: value is computed from published or fixture values.
- `synthetic`: value is intentionally invented for a controlled demo.
- `calibrated_reference`: value is tuned against a reference product or mission
  but is not directly imported from that product.
- `imported`: value comes from an external ephemeris, covariance, CDM, OEM, or
  related product.

### Frame Names

Supported covariance frames for Increment 2:

- `QSW`: default display/interpretation frame for ORB-SAT-1 synthetic
  covariance. Spacecraft-centered; axes are radial, along-track, cross-track.
- `RSW`: accepted as an alias only if normalized to `QSW` at load time.
- `TEME`: accepted for TLE/SGP4-adjacent source covariance only when explicitly
  labeled.
- `EME2000`: accepted for inertial Cartesian covariance only when explicitly
  labeled.
- `ITRF`: accepted only when source data clearly states Earth-fixed covariance.

Unsupported broad labels such as `ECI` and `ECEF` should fail validation unless
they are mapped by a loader to one of the exact supported frames.

### Units

Use kilometers for display and consistency with existing propagation samples:

- `position`: `km`
- `position_covariance`: `km^2`
- optional future velocity units: `km/s`
- optional future position-velocity covariance units: `km^2/s`

If an imported product arrives in meters, normalize to kilometers at the API
boundary and preserve source units in metadata.

### Matrix Shape

Increment 2 should support:

- `position_3x3`: a symmetric 3x3 covariance matrix.

Reserve but do not fully implement:

- `cartesian_6x6`: position and velocity covariance in a Cartesian frame.

Validation should reject non-square, non-symmetric, wrong-sized, negative
diagonal, or non-positive-semidefinite matrices where practical. A small
tolerance is acceptable for floating-point imports.

### Sigma Semantics

Store covariance as 1-sigma covariance. Rendering can choose 1-sigma, 2-sigma,
or 3-sigma surfaces later by scaling eigenvalue square roots.

Fields:

- `covariance_sigma`: `1`
- `display_sigma`: optional, defaulting to `1` only for precomputed visual
  fixtures.
- `confidence_label`: optional text such as `1-sigma synthetic covariance`.

### Series Shape

Proposed data shape:

```json
{
  "object_id": "orb-sat-1",
  "series_id": "orb-sat-1-synthetic-day3-qsw-v1",
  "source": {
    "type": "synthetic_growth",
    "provenance": "synthetic"
  },
  "frame": {
    "name": "QSW",
    "origin": "spacecraft",
    "reference": "nominal_state"
  },
  "units": {
    "position": "km",
    "position_covariance": "km^2"
  },
  "samples": [
    {
      "epoch": "2026-06-20T00:00:00Z",
      "covariance_type": "position_3x3",
      "covariance_sigma": 1,
      "position_covariance": [
        [0.000001, 0.0, 0.0],
        [0.0, 0.000004, 0.0],
        [0.0, 0.0, 0.000001]
      ],
      "provenance": "synthetic"
    }
  ]
}
```

## First Synthetic Growth Strategy

Use an intentionally simple QSW diagonal growth model for ORB-SAT-1:

- Radial uncertainty grows slowly.
- Along-track uncertainty grows fastest.
- Cross-track uncertainty grows moderately.
- Off-diagonal covariance starts at zero.

Initial proposed 1-sigma position standard deviations:

| Time From Epoch | Radial | Along-track | Cross-track |
| --- | ---: | ---: | ---: |
| 0 h | 1 m | 2 m | 1 m |
| 6 h | 20 m | 100 m | 30 m |
| 12 h | 50 m | 300 m | 80 m |
| 24 h | 150 m | 1 km | 250 m |
| 48 h | 500 m | 5 km | 800 m |
| 72 h | 1 km | 15 km | 2 km |

Convert to covariance in `km^2` by squaring the standard deviations in
kilometers.

This is not intended to model a real OD process. It is a controlled visual and
math fixture that makes TLE/SGP4-like uncertainty growth visible without
pretending precision.

## Proposed Implementation Steps

1. Add Pydantic models for uncertainty provenance, covariance frame metadata,
   units, covariance samples, and covariance series.
2. Add validation for exact frame names, timezone-aware epochs, 3x3 shape,
   symmetry, diagonal sign, and basic positive-semidefinite behavior.
3. Add a small ORB-SAT-1 synthetic covariance fixture with the day-3 growth
   samples above.
4. Add focused Python tests for valid fixture loading and invalid matrix/frame
   cases.
5. Add TypeScript mirror types only if Increment 3 will consume the fixture from
   the frontend directly; otherwise defer frontend types to rendering work.
6. Update [RECORD.md](RECORD.md) with commands run and the synthetic-growth
   assumption.

## Expected Files

- `src/orb_lab/models.py`
- Possible module: `src/orb_lab/uncertainty.py`
- `tests/test_uncertainty_models.py`
- `docs/goals/06-uncertainty-and-intersections/fixtures/orb-sat-1.synthetic-covariance.json`
- `docs/goals/06-uncertainty-and-intersections/RECORD.md`
- Goal docs updates.

## Acceptance Criteria

- A 3x3 position covariance sample validates with exact frame, epoch, units,
  sigma, and provenance metadata.
- The ORB-SAT-1 synthetic covariance fixture validates.
- Invalid frame labels such as `ECI` and `ECEF` fail with clear errors.
- Invalid covariance matrices fail with clear errors.
- The model does not require rendering, OEM parsing, or real POD products.
- The docs clearly state that the first growth model is synthetic.

## Validation

- `uv run pytest tests/test_uncertainty_models.py`
- `uv run pytest`
- `uv run ruff check .`
- `pnpm --dir apps/web check` only if TypeScript types are added.

## Open Decisions For Approval

- Use `QSW` as the default synthetic covariance frame for ORB-SAT-1.
- Store covariance matrices in `km^2` internally, normalizing imported meters
  later.
- Implement `position_3x3` first and reserve `cartesian_6x6` for later.
- Use diagonal QSW synthetic growth through 72 hours as the first fixture.
- Keep frontend types out of Increment 2 unless the implementation needs them
  for fixture consumption.

## Not In Scope

- Rendering ellipsoids.
- Estimating covariance from live TLE residuals.
- Importing real CDM/OEM covariance.
- Full orbit determination or Kalman filtering.
- Collision/intersection probability calculations.
