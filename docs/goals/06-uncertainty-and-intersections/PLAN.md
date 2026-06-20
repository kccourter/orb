# Uncertainty and Intersections Increment Plan

## Goal

Investigate and prototype uncertainty visualization from epoch through day 3,
then use that uncertainty model to estimate intersections with other orbits and
modeled WEZ ellipsoids.

Each increment should be approved before implementation. This goal should stay
honest about what is measured, inferred, or synthetic.

## Increment 1: Spacecraft Target Research and Selection

Status: Approved and completed in [SPACECRAFT.md](SPACECRAFT.md). Outcome:
ORB-SAT-1 synthetic spacecraft, with PRISMA Mango as the physical/agility
reference and GRACE-FO as the drag/POD uncertainty reference.

### Objective

Replace ISS as the spacecraft under inspection with a smaller LEO spacecraft
whose public data supports credible drag, maneuver, and uncertainty experiments.

### Scope

- Compare at least three candidate spacecraft or spacecraft classes.
- Record mass, approximate dimensions/cross-section, orbit regime, tracking data
  availability, maneuver/propulsion information, and public data gaps.
- Choose the first Goal 06 target and document why it is good enough.
- Add or update example scenario metadata only after the target is approved.

### Expected Files

- `docs/goals/06-uncertainty-and-intersections/SPACECRAFT.md`
- `docs/goals/06-uncertainty-and-intersections/fixtures/orb-sat-1.spacecraft.json`
- `docs/goals/06-uncertainty-and-intersections/RECORD.md`
- Goal docs update.

### Acceptance Criteria

- The chosen target is smaller than ISS and is in LEO. Completed: ORB-SAT-1
  synthetic LEO inspector.
- Physical and data-product assumptions are cited and labeled as measured,
  published, inferred, or synthetic.
- Drag and delta-v capability gaps are explicit.
- The selection does not require proprietary data for the first implementation.

### Validation

- Documentation review.
- JSON syntax check for the ORB-SAT-1 fixture.
- No code validation expected because the fixture is not wired into runtime.

### Approval Question

Completed decision: proceed with ORB-SAT-1 as the primary Goal 06 target.
Use PRISMA Mango for physical/agility assumptions and GRACE-FO for drag/POD
uncertainty assumptions unless project owner redirects.

## Increment 2: Uncertainty Model and Covariance Strategy

Status: Approved and implemented. See [UNCERTAINTY.md](UNCERTAINTY.md) and
[RECORD.md](RECORD.md).

### Objective

Define the minimum uncertainty representation needed for day-0 through day-3
ellipsoid visualization and later intersection math.

### Scope

- Define a position-first covariance series with epoch, frame, units, matrix,
  sigma, and provenance.
- Use `position_3x3` covariance in `km^2` for the first implementation, while
  reserving a future `cartesian_6x6` path.
- Use `QSW` as the default synthetic ORB-SAT-1 covariance frame, with exact
  frame labels required for all samples.
- Start with a synthetic diagonal QSW growth model through 72 hours; label it as
  synthetic rather than real OD quality.
- Define API models and tests first; add TypeScript mirror types only if needed
  before rendering.

### Expected Files

- `src/orb_lab/models.py`
- `tests/test_uncertainty_models.py`
- `docs/goals/06-uncertainty-and-intersections/UNCERTAINTY.md`
- `docs/goals/06-uncertainty-and-intersections/fixtures/orb-sat-1.synthetic-covariance.json`
- Goal docs update.

### Acceptance Criteria

- A single covariance sample can be validated with frame, epoch, units, and
  sigma metadata.
- The model can express position-only covariance first, with a path to 6x6
  position-velocity covariance.
- Synthetic covariance is clearly labeled when used.
- Unsupported or unlabeled frames fail validation.
- Invalid covariance shapes, asymmetric matrices, and invalid diagonal values
  fail validation.
- The ORB-SAT-1 synthetic day-3 covariance fixture validates.

### Validation

- `uv run pytest tests/test_uncertainty_models.py`
- `uv run pytest`
- `uv run ruff check .`
- `pnpm --dir apps/web check` if frontend types are touched.

### Approval Question

Completed decision: use `position_3x3` QSW synthetic covariance for ORB-SAT-1
through day 3. Frontend rendering remains deferred to Increment 3.

## Increment 3: Ellipsoid Rendering From Epoch Through Day 3

Status: Approved and implemented. See
[ELLIPSOID_RENDERING.md](ELLIPSOID_RENDERING.md) and [RECORD.md](RECORD.md).

### Objective

Render uncertainty ellipsoids along the nominal propagated path at selectable
times from epoch through day 3.

### Scope

- Add a typed frontend copy of the ORB-SAT-1 synthetic covariance fixture.
- Convert `position_3x3` covariance principal axes into Three.js ellipsoid
  geometry.
- Anchor ellipsoid centers to the nearest displayed nominal orbit sample by
  epoch.
- Use QSW orientation from nominal position/velocity when available; document any
  fallback as approximate.
- Add compact controls for visibility, sigma level, and sample density.
- Preserve `synthetic` and `QSW` labels in UI state.
- Verify desktop and narrow viewport behavior, including nonblank canvas checks.

### Expected Files

- `apps/web/src/main.ts`
- `apps/web/src/scene/uncertainty.ts`
- `apps/web/src/uncertainty/types.ts`
- `apps/web/src/uncertainty/orbSat1SyntheticCovariance.ts`
- `apps/web/src/uncertainty/fixtureChecks.ts`
- `apps/web/src/ui/uncertaintyControls.ts`
- `apps/web/src/styles.css`
- `apps/web/tests/orbit-scene.smoke.spec.ts`
- `docs/goals/06-uncertainty-and-intersections/ELLIPSOID_RENDERING.md`
- Goal docs update.

### Acceptance Criteria

- Ellipsoids appear at expected sample times from epoch through day 3.
- Users can toggle uncertainty, choose sigma level, and reduce visible sample
  density.
- The scene remains nonblank and usable with ellipsoids toggled on.
- The nominal trace and Earth/frame context remain readable.
- Users can distinguish synthetic uncertainty from imported uncertainty.
- Ellipsoid geometry is disposed when refreshed or when the app unloads.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`
- Manual browser checks at desktop and narrow viewport sizes.

### Approval Question

Completed decision: render ORB-SAT-1 synthetic QSW uncertainty ellipsoids with
frontend fixture data, QSW orientation, visual gain, and compact controls.

## Increment 4: Back Out Uncertainty From Orbital View

Status: Approved and implemented. See
[ORBITAL_UNCERTAINTY_REMOVAL.md](ORBITAL_UNCERTAINTY_REMOVAL.md) and
[RECORD.md](RECORD.md).

### Objective

Remove uncertainty ellipsoid rendering from the global orbital scene so that
view returns to situational awareness instead of quantitative covariance
inspection.

### Scope

- Disconnect uncertainty ellipsoid rendering from the Earth-scale orbit view.
- Remove the uncertainty control strip from the orbital view.
- Preserve frontend covariance types and fixtures for the local uncertainty
  explorer.
- Retain or move generic ellipsoid math only if it is useful for Increment 6.
- Preserve the Goal 06 record that the orbital-view experiment was tried and
  found unclear.
- Update smoke tests so the orbital view no longer expects uncertainty controls.

### Expected Files

- `apps/web/src/main.ts`
- `apps/web/src/scene/createScene.ts`
- `apps/web/src/styles.css`
- `apps/web/tests/orbit-scene.smoke.spec.ts`
- Possible deletion: `apps/web/src/ui/uncertaintyControls.ts`
- `docs/goals/06-uncertainty-and-intersections/ORBITAL_UNCERTAINTY_REMOVAL.md`
- Goal docs and record updates.

### Acceptance Criteria

- The orbital view has no uncertainty ellipsoid overlay or uncertainty control
  strip.
- The existing orbit trace, Earth, satellite marker, frame controls, and Orekit
  controls still work.
- Goal docs explicitly state that detailed uncertainty belongs in the local
  uncertainty explorer, not the orbital view.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`
- Browser check at desktop and narrow viewport sizes.

### Approval Question

Completed decision: remove uncertainty displays from the orbital view and keep
covariance assets for the local QSW explorer.

## Increment 5: Fixed-Observer Orbital Situation View

Status: Planned in
[FIXED_OBSERVER_ORBIT_VIEW.md](FIXED_OBSERVER_ORBIT_VIEW.md); awaiting approval
to implement.

### Objective

Modify the orbital display into a fixed-observer situational-awareness view:
Earth rotates under the orbit traces while satellites and orbital shells precess
from a stable inertial camera point.

### Scope

- Clarify the meaning of `Duration`: it controls the orbit preview window, not
  the uncertainty horizon.
- Rework camera defaults into a named fixed-inertial-observer preset.
- Keep Earth rotation visually distinct from satellite/orbit trace motion.
- Preserve frame labels and avoid implying that the orbital view is a precise
  uncertainty-measurement surface.
- Relabel the sampling controls as orbit preview controls.
- Prepare the view for multiple actors or shells later without building catalog
  management yet.

### Expected Files

- `apps/web/src/main.ts`
- `apps/web/src/scene/createScene.ts`
- Possible scene/camera module under `apps/web/src/scene/`
- `apps/web/src/ui/controls.ts`
- `apps/web/src/styles.css`
- `apps/web/tests/orbit-scene.smoke.spec.ts`
- `docs/goals/06-uncertainty-and-intersections/FIXED_OBSERVER_ORBIT_VIEW.md`
- Goal docs and record updates.

### Acceptance Criteria

- The scene reads as a fixed-observer orbital situation view.
- Earth rotation is visible under the orbital traces.
- Satellite motion and traces remain readable at desktop and narrow viewports.
- Duration and step controls are labeled or documented as orbit-preview
  sampling controls.
- No uncertainty ellipsoids are shown in this view.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`
- Browser checks for desktop and narrow viewport framing.

### Approval Question

Approve the fixed-observer orbit-view plan before implementation.

## Increment 6: Local QSW Uncertainty Explorer

### Objective

Create a local uncertainty explorer that renders the covariance ellipsoid at a
fixed, readable scale with the spacecraft at the origin and QSW/RSW/RCI-style
frame vectors clearly shown.

### Scope

- Add a local uncertainty view or mode separate from the global orbital view.
- Render the spacecraft at the center with orthogonal local frame vectors.
- Render the selected covariance ellipsoid at fixed scale using the ORB-SAT-1
  synthetic covariance series.
- Add controls for time offset from epoch, including a scrubber through day 3.
- Add view controls for looking along local frame axes and/or orbit-pan/free
  rotation.
- Show quantitative readouts for sigma, axis lengths, frame, provenance, and
  time from epoch.

### Expected Files

- Possible module: `apps/web/src/scene/localUncertaintyExplorer.ts`
- Possible UI module: `apps/web/src/ui/localUncertaintyControls.ts`
- `apps/web/src/uncertainty/`
- `apps/web/src/main.ts`
- `apps/web/src/styles.css`
- `apps/web/tests/orbit-scene.smoke.spec.ts`
- Goal docs and record updates.

### Acceptance Criteria

- A user can scrub from epoch to `+72h` and see the ellipsoid change.
- The spacecraft remains centered and local frame vectors are clearly labeled.
- Users can view along major local axes or freely rotate/pan the local view.
- Axis lengths and covariance provenance are visible as quantitative readouts.
- The global orbital view remains available for situational awareness.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`
- Browser checks at desktop and narrow viewport sizes.

### Approval Question

Approve the local QSW uncertainty explorer UX before returning to external
ephemeris product work.

## Increment 7: Higher-Fidelity Ephemeris Product Investigation

### Objective

Investigate OEM, CPF, and related POD products as paths around TLE limitations.

### Scope

- Test Orekit OEM parsing in the current Python service context.
- Identify at least one realistic public OEM-like fixture or create a clearly
  hand-authored minimal fixture if licensing blocks reuse.
- Investigate CPF format fit for SLR prediction workflows.
- Document whether covariance is available directly, adjacent in another
  product, or must be estimated.
- Compare product roles against TLE/GP data and Goal 05 loader assumptions.

### Expected Files

- `docs/goals/06-uncertainty-and-intersections/EPHEMERIS_PRODUCTS.md`
- Possible parser prototype under `src/orb_lab/`
- Possible fixture under `tests/fixtures/` or `examples/scenarios/`
- Tests if parser behavior is added.

### Acceptance Criteria

- OEM feasibility through Orekit is confirmed or blocked with a concrete reason.
- CPF is categorized as in-scope, adapter-only, or deferred.
- The investigation records how each product handles epoch, frame, interpolation,
  and covariance or uncertainty.
- TLE limitations are described in terms of data product semantics, not just
  visual divergence.

### Validation

- `uv run pytest` if parser code or fixtures are added.
- `uv run ruff check .` if Python code is added.
- Documentation review.

### Approval Question

Approve which ephemeris product path should become production-quality first.

## Increment 8: Orbit-to-Orbit Intersection Probability Prototype

### Objective

Estimate probability of close approach between two propagated states whose
uncertainties grow over time.

### Scope

- Start with synchronized time samples and two Gaussian position covariances.
- Compute relative covariance and probability inside a spherical or ellipsoidal
  encounter volume.
- Provide deterministic test cases for separated, tangent, and overlapping
  uncertainty regions.
- Keep the first result explainable in API output and frontend text/state.

### Expected Files

- Possible module: `src/orb_lab/intersections.py`
- Tests: `tests/test_intersections.py`
- Possible frontend overlay or readout after API behavior is approved.
- Goal docs update.

### Acceptance Criteria

- The prototype can rank low, medium, and high intersection-risk cases.
- Inputs and outputs include frame, units, time, covariance provenance, and
  encounter-volume assumptions.
- The method handles two growing covariance series over the same time window.
- Limitations are documented, especially Gaussian and synchronization
  assumptions.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- `pnpm --dir apps/web check` if frontend code is touched.

### Approval Question

Approve the first probability method before connecting it to UI workflows.

## Increment 9: Orbit-to-WEZ Ellipsoid Intersection Prototype

### Objective

Estimate probability that an uncertain spacecraft state intersects a modeled
WEZ ellipsoid over time.

### Scope

- Define a WEZ ellipsoid as geometry with frame, center, axes, orientation,
  validity interval, and source metadata.
- Compute probability of the spacecraft position distribution lying inside the
  ellipsoid at sampled times.
- Add deterministic tests for outside, boundary, inside, and time-invalid cases.
- Keep WEZ semantics geometric and unclassified; no real engagement modeling.

### Expected Files

- `src/orb_lab/intersections.py`
- Possible model additions in `src/orb_lab/models.py`
- Tests: `tests/test_wez_intersections.py`
- Possible frontend visualization/readout after API behavior is approved.
- Goal docs update.

### Acceptance Criteria

- The prototype supports a stationary or time-tagged WEZ ellipsoid.
- The method reports probability over time and the peak-risk sample.
- Frame and unit mismatches fail clearly.
- Documentation says this is a geometric hazard volume, not a validated weapons
  effects model.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- `pnpm --dir apps/web check` if frontend code is touched.

### Approval Question

Approve the WEZ geometry semantics before adding persistent scenario fixtures.

## Increment 10: Records, Fixtures, and Completion Pass

### Objective

Make the investigation reproducible and leave accurate implementation records.

### Scope

- Add representative fixtures for the selected spacecraft, covariance samples,
  and intersection examples.
- Record commands run, manual browser checks, and frame/unit assumptions.
- Update Goal 06 docs from plan language to implementation record language.
- Update higher-level docs only where the implemented behavior changes the
  project workflow or architecture.

### Expected Files

- `docs/goals/06-uncertainty-and-intersections/RECORD.md`
- Goal README/PLAN updates.
- Possible README or architecture/design doc update if runtime paths change.

### Acceptance Criteria

- A developer can reproduce the uncertainty and intersection demos locally.
- Completed increments are reflected in `RECORD.md`.
- Stale language such as draft-only decisions is removed or moved to remaining
  risks.
- Validation commands and manual scene checks are listed with outcomes.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`

### Approval Question

Approve Goal 06 completion and decide the next exploration track.

## Open Decisions

- Whether GRACE-FO, Sentinel-2, SkySat-class, or another LEO spacecraft should
  replace ISS for the first uncertainty view.
- Whether the first covariance model should be synthetic growth, imported from a
  product, or estimated from TLE/OEM residuals.
- Which covariance display frame should be default: source frame, QSW/RSW, or a
  user-selectable mode.
- Whether the local uncertainty explorer should use `QSW`, `RSW`, or `RCI`
  terminology in the UI, while preserving exact internal frame labels.
- Whether intersection probability belongs in a new API endpoint or as an
  optional analysis block on propagation responses.
- How to represent time-varying WEZ ellipsoids without overbuilding a mission
  planning system.

## Not In Scope

- Classified or operational engagement modeling.
- Full orbit determination from raw tracking measurements.
- Validated collision avoidance maneuver planning.
- Persistent spacecraft catalog management.
- Production-grade covariance realism for every source product.
