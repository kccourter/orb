# Goal 06 Implementation Record

## Increment 1: Spacecraft Target Research and Selection

Status: implemented.

### Outcome

ORB-SAT-1 is the primary spacecraft under inspection for Goal 06. It is a
synthetic agile LEO reference spacecraft, not a claim about a flown vehicle.

- PRISMA Mango provides the physical and agile-mission reference: compact LEO
  spacecraft, formation-flying/rendezvous mission personality, 145 kg class
  mass, and 1 N class HPGP propulsion heritage.
- GRACE-FO provides the drag/POD uncertainty reference: public accelerometer,
  GNSS, K-band/laser ranging, and precise-orbit research context.
- Sentinel-2 and SkySat-class spacecraft remain documented comparison cases but
  are not the first target.

### Artifacts

- [SPACECRAFT.md](SPACECRAFT.md) records candidate research, assumption labels,
  and the ORB-SAT-1 decision.
- [fixtures/orb-sat-1.spacecraft.json](fixtures/orb-sat-1.spacecraft.json)
  captures the first ORB-SAT-1 metadata fixture.
- [README.md](README.md) and [PLAN.md](PLAN.md) mark Increment 1 complete.

### Implementation Notes

- The ORB-SAT-1 fixture is intentionally goal-local documentation data. It is
  not wired into the runtime API or frontend yet.
- Runtime scenario loading still belongs to the Goal 05 loader path and later
  Goal 06 increments.
- Covariance shape, sigma level, frame semantics, and uncertainty growth are
  deferred to Increment 2.
- Generated ephemeris, TLE, OEM, or maneuver timelines are deferred until the
  relevant schema decisions are approved.

### Validation

- Documentation review.
- JSON syntax check for
  `docs/goals/06-uncertainty-and-intersections/fixtures/orb-sat-1.spacecraft.json`.

Command run:

```sh
node --input-type=module -e "import fs from 'node:fs'; JSON.parse(fs.readFileSync('docs/goals/06-uncertainty-and-intersections/fixtures/orb-sat-1.spacecraft.json', 'utf8')); console.log('orb-sat-1 fixture JSON ok');"
```

Result: passed.

## Increment 2: Uncertainty Model and Covariance Strategy

Status: implemented.

### Outcome

The project now has a first uncertainty schema for ORB-SAT-1:

- `CovarianceSeries` groups uncertainty samples for one object.
- `CovarianceSample` supports `position_3x3` covariance in `km^2`.
- `CovarianceFrameMetadata` accepts exact `QSW`, `TEME`, `EME2000`, and `ITRF`
  frame labels, and normalizes `RSW` to `QSW`.
- Broad frame labels such as `ECI`, `ECEF`, and `native` are rejected.
- Samples require timezone-aware epochs, 1-sigma covariance semantics, and
  provenance labels.
- 3x3 matrices are validated for shape, finite values, nonnegative diagonal,
  symmetry, and positive-semidefinite behavior.

The first ORB-SAT-1 synthetic covariance fixture covers epoch through day 3 in
QSW with diagonal covariance growth. It is intentionally synthetic and is not
claimed as an orbit determination product.

### Artifacts

- `src/orb_lab/models.py`
- `tests/test_uncertainty_models.py`
- [fixtures/orb-sat-1.synthetic-covariance.json](fixtures/orb-sat-1.synthetic-covariance.json)
- [UNCERTAINTY.md](UNCERTAINTY.md)

### Implementation Notes

- The covariance fixture is goal-local and not wired into the API or frontend.
- TypeScript mirror types were deferred because Increment 3 owns rendering and
  frontend consumption.
- Imported covariance, OEM/CDM covariance, residual-estimated covariance, and
  6x6 position-velocity covariance are deferred.

### Validation

Commands run:

```sh
uv run pytest tests/test_uncertainty_models.py
uv run pytest
uv run ruff check .
```

Results:

- `tests/test_uncertainty_models.py`: 11 passed.
- Full pytest suite: 40 passed, 5 skipped.
- Ruff: all checks passed.
