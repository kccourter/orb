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

Status: Approved and implemented. See
[FIXED_OBSERVER_ORBIT_VIEW.md](FIXED_OBSERVER_ORBIT_VIEW.md) and
[RECORD.md](RECORD.md).

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

Completed decision: use a named fixed-inertial-observer camera preset, visible
Earth reference lines, and orbit-preview labels.

## Increment 6: Local QSW Uncertainty Explorer

Status: Approved and implemented. See
[LOCAL_QSW_UNCERTAINTY_EXPLORER.md](LOCAL_QSW_UNCERTAINTY_EXPLORER.md) and
[RECORD.md](RECORD.md).

### Objective

Create a local uncertainty explorer that renders the covariance ellipsoid at a
fixed, readable scale with the spacecraft at the origin and QSW/RSW/RCI-style
frame vectors clearly shown.

This increment should make the covariance itself inspectable without competing
with the Earth-scale orbital situation view. The global scene remains for
orbital context; the local explorer is for quantitative shape, frame, and time
inspection.

### Scope

- Add a separate local uncertainty explorer panel or mode alongside the global
  orbital view. Prefer an in-app mode switch or split layout over restoring
  uncertainty overlays to the global orbital view.
- Reuse the ORB-SAT-1 synthetic QSW covariance fixture and frontend uncertainty
  types from Increment 3.
- Render the spacecraft at the local origin with Q, S, and W basis vectors.
  `Q` is radial, `S` is along-track, and `W` is cross-track angular momentum.
- Render the selected covariance ellipsoid centered on the spacecraft. Use real
  axis lengths in kilometers for readouts and a documented local display gain
  for the mesh so epoch and day-3 cases are both readable.
- Support `1σ`, `2σ`, and `3σ` surfaces by scaling the covariance-derived
  standard deviations.
- Add time controls from epoch through `+72h`, including a slider/scrubber and
  direct sample stepping between fixture samples.
- Interpolate between neighboring covariance samples only if it can be labeled
  clearly as interpolated.
- Add compact view controls for canonical local directions: look along `+Q`,
  `+S`, `+W`, and return to an isometric default view.
- Defer free orbit controls unless they are cheap and do not destabilize mobile
  layout.
- Show quantitative readouts for selected offset from epoch, UTC timestamp,
  sigma level, axis lengths, frame label, provenance, covariance units, and
  exact-versus-interpolated sample status.
- Keep global orbit controls and Orekit comparison behavior intact.

### Recommended UX

Use a compact operational layout rather than a landing-style page:

- Left or top controls: global/local view toggle, time scrubber, sigma selector,
  and view-axis buttons.
- Main local canvas: spacecraft marker at origin, labeled Q/S/W axes, ellipsoid,
  and a subtle local grid or tick marks. Do not render Earth in this view except
  for an optional tiny direction cue on the `-Q` side.
- Readout strip: concise numeric values for the current covariance sample.

The local view should default to the first covariance sample at epoch, `2σ`, and
an isometric or `+W`-biased view that makes all three axes readable.

### Data Flow

1. Load `orbSat1SyntheticCovariance` from `apps/web/src/uncertainty/`.
2. Derive the active covariance sample from the selected time offset.
3. Convert the 3x3 covariance into principal axes. Diagonal fixture values can
   be displayed directly in Q/S/W order, while the generic symmetric eigensystem
   path should remain reusable for future non-diagonal covariance.
4. Compute readout axis lengths from `sqrt(eigenvalue) * sigma`.
5. Render the ellipsoid in local scene units with a local-only display scale.
6. Dispose and replace local scene geometry when sigma, time, or view changes.

The first implementation does not need nominal orbit samples because the
covariance is already expressed in local QSW coordinates. Later imported
Cartesian covariance can add frame conversion before this local scene boundary.

### Scene And UI Boundaries

- Keep the existing global orbital scene code focused on the Earth-scale
  situation view.
- Add a dedicated local explorer scene module that owns local camera and
  renderer behavior, Q/S/W axes and labels, the spacecraft marker, and
  covariance ellipsoid mesh lifecycle.
- Keep local explorer UI state separate from orbit preview settings. Changing
  the global preview duration or frame should not implicitly change the local
  covariance sample.
- Reuse existing covariance and ellipsoid helpers where it keeps the code
  smaller, but do not reintroduce uncertainty controls into the global scene.

### Expected Files

- Possible module: `apps/web/src/scene/localUncertaintyExplorer.ts`
- Possible UI module: `apps/web/src/ui/localUncertaintyControls.ts`
- `apps/web/src/uncertainty/`
- `apps/web/src/main.ts`
- `apps/web/src/styles.css`
- `apps/web/tests/orbit-scene.smoke.spec.ts`
- Possible test fixture/update under `apps/web/src/uncertainty/fixtureChecks.ts`
- New plan/record doc:
  `docs/goals/06-uncertainty-and-intersections/LOCAL_QSW_UNCERTAINTY_EXPLORER.md`
- Goal docs and record updates.

### Acceptance Criteria

- A user can switch between global orbital context and the local QSW explorer.
- A user can scrub from epoch to `+72h` and see the ellipsoid change without
  moving the spacecraft away from the local origin.
- The spacecraft remains centered and local Q/S/W frame vectors are clearly
  labeled.
- Users can view along major local axes and return to a default readable view.
- Axis lengths and covariance provenance are visible as quantitative readouts.
- Sigma changes update both the ellipsoid mesh and readout values.
- The UI clearly labels the covariance as ORB-SAT-1 synthetic QSW data.
- The global orbital view remains available for situational awareness.
- The global orbital view still has no uncertainty ellipsoid overlay.
- Geometry and materials are disposed when the local explorer is updated or
  unloaded.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`
- Browser checks at desktop and narrow viewport sizes.
- Manual checks should confirm the global scene remains nonblank and usable,
  the local explorer scene is nonblank, Q/S/W labels and controls do not
  overlap, changing time and sigma visibly updates the ellipsoid, and the
  global view still contains no uncertainty controls or ellipsoids.

### Not In Scope

- API serving of covariance products.
- Real OD covariance, CDM covariance, OEM covariance, or covariance conversion
  from imported Cartesian frames.
- Replacing the synthetic ORB-SAT-1 fixture.
- Intersection probability readouts.
- Restoring uncertainty ellipsoid rendering to the global orbital situation
  view.
- Full mission timeline integration beyond the local `0h` through `72h`
  covariance scrubber.

### Approval Question

Completed decision: implement a separate local QSW explorer mode with Q/S/W
axes, exact fixture-sample stepping from `0h` through `72h`, sigma controls, and
concise quantitative readouts.

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
