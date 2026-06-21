# Goal 06: Uncertainty and Intersections

## Objective

Start visualizing propagation uncertainty over time and investigate probability
of intersection with other uncertain or modeled regions.

This goal should move Orb Lab from deterministic traces toward uncertainty-aware
scenario inspection: covariance growth, ellipsoid rendering, higher-fidelity
ephemeris inputs, and first-pass intersection probability experiments.

## Why Sixth

Goal 05 establishes scenario loading so the app can swap source data without
hard-coding each experiment. The next leverage point is showing that the same
nominal orbit can become increasingly uncertain, especially when using TLE/SGP4
outside its intended freshness window.

## Acceptance Criteria

- A replacement LEO spacecraft target is selected with documented physical,
  drag, maneuver, and data-availability assumptions.
- The project has a compact uncertainty model that can represent position
  covariance from epoch through day 3.
- The Three.js scene can render uncertainty ellipsoids along a propagated trace
  without hiding the nominal orbit or frame context.
- The investigation records how OEM, CPF, and other POD-like products could
  reduce reliance on TLE-only workflows.
- The project has a first-pass method for estimating intersection probability
  between two uncertain orbital states.
- The project has a first-pass method for estimating intersection probability
  between an uncertain orbital state and a modeled WEZ ellipsoid.

## Proposed Increments

1. Research and select the Goal 06 spacecraft target. Completed: see
   [SPACECRAFT.md](SPACECRAFT.md).
2. Define uncertainty data model and covariance source strategy. Completed: see
   [UNCERTAINTY.md](UNCERTAINTY.md).
3. Add uncertainty ellipsoid rendering from epoch through day 3. Completed as
   an experiment; see
   [ELLIPSOID_RENDERING.md](ELLIPSOID_RENDERING.md).
4. Back out uncertainty displays from the orbital view. Completed: see
   [ORBITAL_UNCERTAINTY_REMOVAL.md](ORBITAL_UNCERTAINTY_REMOVAL.md).
5. Modify the orbital display into a fixed-observer situation view. Completed:
   see [FIXED_OBSERVER_ORBIT_VIEW.md](FIXED_OBSERVER_ORBIT_VIEW.md).
6. Create a local QSW uncertainty explorer display. Completed: see
   [LOCAL_QSW_UNCERTAINTY_EXPLORER.md](LOCAL_QSW_UNCERTAINTY_EXPLORER.md).
7. Investigate and prototype higher-fidelity ephemeris products. Completed:
   see [EPHEMERIS_PRODUCTS.md](EPHEMERIS_PRODUCTS.md).
8. Prototype orbit-to-orbit intersection probability.
9. Prototype orbit-to-WEZ ellipsoid intersection probability.
10. Record validation, assumptions, and remaining risks.

See [PLAN.md](PLAN.md) for approval-sized implementation increments.
Implementation notes are tracked in [RECORD.md](RECORD.md).

## Initial Research Notes

### Spacecraft Selection

Increment 1 recommends **ORB-SAT-1** as the primary spacecraft under inspection:
a synthetic agile LEO reference spacecraft that combines PRISMA-like physical
and maneuver assumptions with GRACE-FO-inspired drag/POD uncertainty research.

- ORB-SAT-1: best primary target because it gives Orb Lab one coherent
  spacecraft identity while requiring explicit provenance labels for synthetic,
  derived, published-reference, and calibrated-reference parameters.
- PRISMA Mango: best physical/agility reference because it is a small LEO
  formation-flying and rendezvous demonstrator with public mass, dimensions,
  orbit class, and propulsion heritage; used as the physical/agility reference.
- GRACE-FO 1/2: best reference target for drag and precise-orbit research
  because of public accelerometer, GNSS, KBR/LRI, and POD ecosystem context;
  used as the drag/POD uncertainty reference.
- Sentinel-2A/B/C: useful operational LEO reference, but larger and less
  inspection-like.
- SkySat-class commercial imaging spacecraft: closer to a modern taskable agile
  LEO spacecraft, but public mass-property, drag-area, and maneuver-authority
  details are too thin for the first model.

See [SPACECRAFT.md](SPACECRAFT.md) for assumption labels, gaps, and references.
The first ORB-SAT-1 metadata fixture lives at
[fixtures/orb-sat-1.spacecraft.json](fixtures/orb-sat-1.spacecraft.json).

### Data Product Leads

- CelesTrak GP data keeps the current TLE/SGP4 comparison path relevant, but GP
  data is still mean-element data fit for SGP4 rather than a high-fidelity
  ephemeris source.
- CCSDS OEM is the main candidate for externally supplied ephemeris samples.
  Orekit has an OEM parser, so this should align with the authoritative Python
  side of the project.
- CPF is worth investigating for satellite laser ranging predictions and as a
  bridge to precise tracking workflows, but it may not fit the same scenario
  schema as OEM without adapter work.
- CDM-like conjunction products are worth studying for covariance and
  probability-of-collision conventions, even if the first implementation uses a
  simpler internal model.

## Design Notes

- Keep covariance frame labels explicit. Do not render a covariance ellipsoid
  unless its frame and units are known.
- Prefer local orbital frames such as QSW/RSW for display controls and
  interpretability, but preserve source covariance frames during ingestion.
- Treat visual ellipsoids as confidence surfaces with stated sigma levels, not
  literal hard boundaries.
- Keep uncertainty sampling separate from nominal propagation sampling so the
  UI can show the cost and provenance of each layer.
- For intersections, start with explainable approximations before adding
  Monte Carlo or unscented-transform variants.

## Dependencies

- Goal 03 trace comparison and overlay patterns.
- Goal 04 frame controls and frame naming policy.
- Goal 05 scenario loading and OEM/CCSDS direction.

## Risks

- Public spacecraft data may not include enough maneuver authority or drag
  detail to support a credible agile-spacecraft model.
- TLE-derived uncertainty is not directly encoded in TLEs; any covariance growth
  model must be explicitly synthetic, estimated from residuals, or imported from
  higher-fidelity products.
- Covariance in Cartesian ECI/TEME coordinates can become misleading under
  nonlinear propagation; local orbital-frame display may be clearer.
- Probability-of-intersection results can look authoritative even when the
  assumptions are intentionally first-pass.
- WEZ modeling can become a domain rabbit hole. Keep the first model purely
  geometric: an ellipsoid with frame, center, covariance-like axes, and time
  validity.

## Validation

- `uv run pytest`
- `uv run ruff check .`
- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`
- Manual browser checks at desktop and narrow viewport sizes for nonblank,
  correctly framed uncertainty ellipsoids.

## References Checked

- CelesTrak GP data format notes:
  <https://celestrak.org/NORAD/documentation/gp-data-formats.php>
- Orekit OEM parser API:
  <https://www.orekit.org/site-orekit-latest/apidocs/org/orekit/files/ccsds/ndm/odm/oem/OemParser.html>
- GRACE/GRACE-FO mission and instrument overview:
  <https://en.wikipedia.org/wiki/GRACE_and_GRACE-FO>
- Sentinel-2 mission overview:
  <https://en.wikipedia.org/wiki/Sentinel-2>
- SkySat constellation overview:
  <https://en.wikipedia.org/wiki/SkySat>
