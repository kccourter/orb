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

1. Research and select the Goal 06 spacecraft target.
2. Define uncertainty data model and covariance source strategy.
3. Add uncertainty ellipsoid rendering from epoch through day 3.
4. Investigate and prototype higher-fidelity ephemeris products.
5. Prototype orbit-to-orbit intersection probability.
6. Prototype orbit-to-WEZ ellipsoid intersection probability.
7. Record validation, assumptions, and remaining risks.

See [PLAN.md](PLAN.md) for approval-sized implementation increments.

## Initial Research Notes

### Spacecraft Candidates

The initial recommendation is to evaluate these candidates before committing:

- GRACE-FO 1 or 2: smaller LEO spacecraft than ISS, public mission literature,
  precise GPS tracking, accelerometer data for non-gravitational force
  separation, laser ranging, and a strong POD research ecosystem. This is likely
  the best data-rich proxy for uncertainty and drag modeling, but it is not an
  agile inspection spacecraft.
- Sentinel-2A/B/C: active LEO Earth-observation spacecraft with well-known
  public mission geometry and consistent sun-synchronous operations. Better
  operational continuity than GRACE-FO, but less attractive for drag and delta-v
  model transparency.
- SkySat-class commercial imaging spacecraft: closer to the desired small,
  agile LEO inspection profile and includes propulsion on later spacecraft, but
  mass properties, drag area, maneuver authority, and POD products are less
  openly documented.

The plan should favor a spacecraft with public physical and tracking data over a
spacecraft that merely sounds agile. A poor physical model would make the
uncertainty visualization look precise while teaching the wrong lesson.

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
