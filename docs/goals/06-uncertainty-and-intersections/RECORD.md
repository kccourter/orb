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

## Increment 3: Ellipsoid Rendering From Epoch Through Day 3

Status: implemented.

### Outcome

The web scene now renders ORB-SAT-1 synthetic QSW uncertainty ellipsoids from
epoch through day 3.

- Added a typed frontend covariance fixture copy under `apps/web/src/uncertainty/`.
- Added fixture checks for object id, frame, covariance type, ordering, and
  nonnegative diagonal covariance.
- Added Three.js ellipsoid mesh generation from `position_3x3` covariance.
- Oriented ellipsoids using a QSW basis computed from nominal position and
  velocity samples.
- Added visual gain so meter-to-kilometer covariance is inspectable at Earth
  scene scale while leaving fixture data in `km^2`.
- Added compact controls for visibility, sigma level, and sample density.
- Added Playwright smoke coverage for the uncertainty controls.

### Artifacts

- `apps/web/src/uncertainty/types.ts`
- `apps/web/src/uncertainty/orbSat1SyntheticCovariance.ts`
- `apps/web/src/uncertainty/fixtureChecks.ts`
- `apps/web/src/scene/uncertainty.ts`
- `apps/web/src/scene/createScene.ts`
- `apps/web/src/ui/uncertaintyControls.ts`
- `apps/web/src/main.ts`
- `apps/web/src/styles.css`
- `apps/web/tests/orbit-scene.smoke.spec.ts`
- [ELLIPSOID_RENDERING.md](ELLIPSOID_RENDERING.md)

### Implementation Notes

- The frontend fixture is a copy of the goal-local covariance fixture. Later
  scenario loading can remove this duplication by serving fixtures through the
  API.
- Ellipsoid anchors are generated at covariance sample offsets relative to the
  selected nominal epoch, so the layer can show day-3 uncertainty without
  changing the existing sampling control limits.
- The layer remains synthetic and explicitly labeled `QSW synthetic`.
- API-served covariance, real POD products, and intersection probability remain
  deferred.

### Validation

Commands run:

```sh
CI=true pnpm --dir apps/web check
CI=true pnpm --dir apps/web build
CI=true pnpm --dir apps/web smoke
```

Results:

- TypeScript check: passed.
- Vite build: passed, with existing satellite.js browser-externalization and
  chunk-size warnings.
- Playwright smoke: 5 passed.

Browser checks:

- Desktop viewport `1280x800`: uncertainty controls visible, canvas nonblank,
  ellipsoid layer visible.
- Narrow viewport `390x844`: control stack has clear vertical spacing, canvas
  nonblank, ellipsoid layer visible.

### Follow-Up UI Fix

After local demo feedback, the controls were moved into a single stacked
container so browser/font scaling cannot make the uncertainty panel overlap the
Orekit panel. The uncertainty ellipsoid minimum display radius was also
increased so `Current` mode is visible at Earth scene scale.

Follow-on decision: the orbital uncertainty overlay remains a useful experiment,
but detailed uncertainty does not belong in the global orbital situation view.
The next increments back it out, redesign the orbital view for fixed-observer
situational awareness, and move ellipsoid inspection into a local QSW explorer.

Follow-up validation:

```sh
apps/web/node_modules/.bin/tsc --noEmit
apps/web/node_modules/.bin/vite build
```

Results:

- TypeScript check: passed.
- Vite build: passed, with the existing satellite.js browser-externalization and
  chunk-size warnings.
- Wide viewport `2012x1215` with `3σ` + `Current`: controls stacked cleanly and
  the current ellipsoid is visibly rendered.

## Increment 4: Back Out Uncertainty From Orbital View

Status: implemented.

### Outcome

The global orbital view no longer renders uncertainty ellipsoids or uncertainty
controls. It is back to orbit situational awareness: orbit sampling controls,
frame controls, Orekit comparison controls, Earth, traces, and the satellite
marker.

Reusable uncertainty assets remain available for Increment 6:

- frontend covariance types;
- ORB-SAT-1 synthetic covariance fixture;
- frontend fixture checks;
- generic ellipsoid-building math under `apps/web/src/scene/uncertainty.ts`.

### Artifacts

- `apps/web/src/main.ts`
- `apps/web/src/scene/createScene.ts`
- `apps/web/src/styles.css`
- `apps/web/tests/orbit-scene.smoke.spec.ts`
- Deleted `apps/web/src/ui/uncertaintyControls.ts`
- [ORBITAL_UNCERTAINTY_REMOVAL.md](ORBITAL_UNCERTAINTY_REMOVAL.md)

### Implementation Notes

- `main.ts` no longer imports the ORB-SAT-1 covariance fixture or ellipsoid
  scene builder.
- `createScene.ts` no longer owns an uncertainty mesh group.
- The smoke suite now asserts that uncertainty controls are absent from the
  orbital view.
- Detailed covariance inspection is deferred to the local QSW explorer.

### Validation

Commands run:

```sh
apps/web/node_modules/.bin/tsc --noEmit
apps/web/node_modules/.bin/vite build
CI=true pnpm --dir apps/web smoke
```

Results:

- TypeScript check: passed.
- Vite build: passed, with the existing satellite.js browser-externalization and
  chunk-size warnings.
- Playwright smoke: 5 passed.

Browser checks:

- Desktop viewport `1280x800`: no uncertainty controls, clean control stack,
  canvas rendered.
- Narrow viewport `390x844`: no uncertainty controls, clean control stack,
  canvas rendered.

## Increment 5: Fixed-Observer Orbital Situation View

Status: implemented.

### Outcome

The orbital view now has a clearer fixed-observer situation-view posture.

- Added a named `fixed_inertial_observer` camera preset.
- Kept the camera stationary in scene coordinates.
- Added subtle Earth reference rings so Earth rotation is visible under orbit
  traces.
- Centered the fixed display on the sampled orbit's ascending equator crossing
  instead of Earth center, and rotated that node radial toward the fixed
  observer.
- Added a fixed ascending-node marker at the display origin so the anchor is
  visible even when the LEO Earth limb dominates the view.
- Relabeled the sampling controls from `Duration`/`Step` to `Preview`/`Sample`.
- Updated the orbit controls accessible label to `Orbit preview controls`.
- Preserved Goal 04 frame behavior and kept uncertainty out of the orbital view.

### Artifacts

- `apps/web/src/scene/cameraPresets.ts`
- `apps/web/src/scene/createScene.ts`
- `apps/web/src/orbits/nodes.ts`
- `apps/web/src/scene/orbitTrace.ts`
- `apps/web/src/ui/controls.ts`
- `apps/web/tests/orbit-scene.smoke.spec.ts`
- [FIXED_OBSERVER_ORBIT_VIEW.md](FIXED_OBSERVER_ORBIT_VIEW.md)

### Implementation Notes

- Earth reference rings are visual context, not an authoritative Earth-fixed
  transform.
- The scene owns a display-origin transform so Earth, traces, and markers move
  together when the fixed view is centered on the ascending node.
- The display-origin transform translates the selected node to scene origin and
  rotates the world so the node is directly along the camera viewpoint.
- The ascending-node marker is a visual anchor, not an additional propagated
  actor.
- `Preview` still maps to the existing orbit preview duration in minutes.
- `Sample` still maps to the existing sample interval in seconds.
- User camera orbit/pan controls remain deferred.

### Validation

Commands run:

```sh
pnpm --dir apps/web check
pnpm --dir apps/web build
pnpm --dir apps/web exec playwright test --config /private/tmp/orb-playwright-no-webserver.config.ts
```

Results:

- TypeScript check: passed.
- Vite build: passed, with the existing satellite.js browser-externalization and
  chunk-size warnings.
- Playwright smoke: 5 passed. The default `pnpm --dir apps/web smoke` server
  startup hit `EPERM` on `127.0.0.1:5173`; validation used an explicit local
  dev server on the same port and a temporary no-web-server Playwright config.

Browser checks:

- Desktop viewport `1280x800`: `Epoch`/`Preview`/`Sample` labels visible, no
  uncertainty controls, canvas rendered.
- Desktop viewport `1438x800`: ascending-node marker centered in the viewport
  and aligned with the Earth disk behind it.
- Narrow viewport `390x844`: labels visible, controls do not overlap, no
  uncertainty controls, canvas rendered.

## Increment 6: Local QSW Uncertainty Explorer

Status: implemented.

### Outcome

The app now includes a separate local QSW uncertainty explorer mode.

- Added an `Orbit` / `QSW` mode switch.
- Kept the global orbit scene free of uncertainty ellipsoid overlays.
- Added a dedicated local Three.js scene for ORB-SAT-1 synthetic QSW
  covariance.
- Rendered the spacecraft at the local origin with labeled Q, S, and W axes.
- Rendered the selected covariance ellipsoid at local readable scale.
- Added controls for exact fixture-sample stepping from epoch through `+72h`,
  sigma selection, and `Iso` / `+Q` / `+S` / `+W` view presets.
- Added concise readouts for time, Q/S/W axis lengths, frame/units, and
  synthetic provenance.

### Artifacts

- `apps/web/src/main.ts`
- `apps/web/src/scene/localUncertaintyExplorer.ts`
- `apps/web/src/scene/uncertainty.ts`
- `apps/web/src/ui/localUncertaintyControls.ts`
- `apps/web/src/styles.css`
- `apps/web/tests/orbit-scene.smoke.spec.ts`
- [LOCAL_QSW_UNCERTAINTY_EXPLORER.md](LOCAL_QSW_UNCERTAINTY_EXPLORER.md)
- [PLAN.md](PLAN.md)
- [README.md](README.md)

### Implementation Notes

- The local explorer uses the existing frontend copy of the ORB-SAT-1 synthetic
  covariance fixture.
- The current fixture is diagonal in QSW, so Q/S/W readouts are direct sigma
  axis lengths in physical meters or kilometers.
- The local mesh uses a display gain only inside the local scene. The readouts
  are not display-scaled.
- The scrubber steps through exact covariance fixture samples. Interpolation is
  deferred.
- The local scene owns its own renderer, camera, controls, labels, ellipsoid
  geometry, and disposal path.

### Validation

Commands run:

```sh
pnpm --dir apps/web check
pnpm --dir apps/web build
pnpm --dir apps/web smoke
```

Results:

- TypeScript check: passed.
- Vite build: passed, with the existing satellite.js browser-externalization and
  chunk-size warnings.
- Playwright smoke: 6 passed. The first sandboxed smoke attempt hit `EPERM` on
  `127.0.0.1:5173`; rerunning the same command with approved escalation passed.

Browser checks:

- Desktop viewport `1280x800`: local QSW scene nonblank, Q/S/W labels visible,
  readouts readable, and mode switch usable.
- Narrow viewport `390x844`: local QSW controls stack cleanly, readouts remain
  readable, and mode switch remains reachable.
- Global orbit view remains nonblank after returning from QSW mode and still has
  no uncertainty controls or ellipsoid overlay.

### Follow-Up: Smooth Scrubber And Playback

After visual review, the QSW offset scrubber was refined from exact sample
stepping to fine-grained continuous offsets.

- Added linear interpolation between neighboring covariance fixture samples.
- Labeled interpolated readouts as `synthetic interpolated` and exact fixture
  points as `synthetic exact`.
- Added play/pause controls with `1x`, `5x`, `10x`, `15x`, `30x`, and `60x`
  speed options.
- Advanced playback from animation-frame deltas for smooth visual changes.
- Shortened timestamp formatting in the readout so desktop and narrow layouts
  remain readable.

Validation after the follow-up:

```sh
pnpm --dir apps/web check
pnpm --dir apps/web build
pnpm --dir apps/web smoke
```

Results:

- TypeScript check: passed.
- Vite build: passed, with the existing satellite.js browser-externalization and
  chunk-size warnings.
- Playwright smoke: 6 passed.

## Increment 7: Higher-Fidelity Ephemeris Product Investigation

Status: implemented.

### Outcome

CCSDS OEM is the recommended first production-quality external ephemeris loader
path for Orb Lab.

- OEM matches Orb Lab's sampled Cartesian trace workflow and carries explicit
  frame, time system, start/stop, and interpolation metadata.
- Orekit's CCSDS OEM parser is reachable from the current `orekit-jpype`
  runtime.
- A minimal hand-authored OEM fixture parses through Orekit and normalizes
  positions and velocities from Orekit SI units into the project's `km` and
  `km/s` conventions.
- CPF is documented as an adapter-only/deferred product category for SLR
  prediction workflows.
- CDM and POD-adjacent covariance products are documented as later inputs for
  intersection probability and covariance semantics, not as the first nominal
  ephemeris loader.

### Artifacts

- [EPHEMERIS_PRODUCTS.md](EPHEMERIS_PRODUCTS.md)
- `src/orb_lab/ephemeris_products.py`
- `tests/fixtures/orb-sat-1-minimal.oem`
- `tests/test_ephemeris_products.py`
- [PLAN.md](PLAN.md)
- [README.md](README.md)

### Implementation Notes

- The parser spike deliberately inspects only the first OEM segment and does
  not expose a public API route.
- The OEM fixture is hand-authored format/loader test data, not a physical
  truth trajectory for ORB-SAT-1.
- The helper uses existing Orekit data initialization and returns timezone-aware
  UTC `datetime` values.
- Production scenario loading remains a Goal 05 boundary. This increment
  supplies the feasibility proof and recommended shape for that loader.
- OEM covariance blocks are important but intentionally deferred until nominal
  OEM trace ingestion is stable.

### Validation

Commands run:

```sh
uv run pytest tests/test_ephemeris_products.py
UV_CACHE_DIR=/Users/kcourter/dev/orb/.uv-cache OREKIT_DATA_PATH=/Users/kcourter/dev/orb/orekit-data.zip uv run pytest tests/test_ephemeris_products.py
uv run pytest
uv run ruff check .
```

Results:

- Focused tests without `OREKIT_DATA_PATH`: 1 passed, 1 skipped.
- Focused tests with local Orekit data: 2 passed.
- Full pytest suite: 41 passed, 6 skipped.
- Ruff: all checks passed.

## Increment 8: Distinct Control and Render Panes

Status: implemented.

### Outcome

The orbital view now separates controls from rendering instead of drawing
control panels over Earth and orbit imagery.

- Added a two-pane app shell with a dedicated control pane and render pane.
- Moved the `Orbit` / `QSW` switch, orbit sampling controls, frame controls,
  and Orekit comparison status into the control pane.
- Kept the Three.js canvases inside the render pane and resized scenes from the
  render pane bounds instead of the full browser viewport.
- Preserved the existing `Orbit` / `QSW` mode behavior and local QSW explorer.
- Added denser Earth meridian reference cues, with major and minor lines drawn
  subtly above the globe so slow rotation/precession is easier to see.
- Added smoke coverage for control/render pane separation.

### Artifacts

- `apps/web/src/main.ts`
- `apps/web/src/scene/createScene.ts`
- `apps/web/src/styles.css`
- `apps/web/tests/orbit-scene.smoke.spec.ts`
- [PLAN.md](PLAN.md)
- [README.md](README.md)

### Implementation Notes

- The render pane owns canvas sizing; the global and local scenes both resize
  to the render pane's bounding box.
- On desktop, controls occupy a left pane and rendering occupies the remaining
  viewport.
- On narrow screens, controls stack above the render pane with scrolling in the
  control pane so form controls do not overlap visualization content.
- Earth reference lines remain visual cues only. They are not an authoritative
  Earth-fixed grid.
- Follow-up visual review found the first meridian pass too overlay-like. The
  final version keeps the pane layout, but treats meridians as static,
  depth-tested Earth-child geometry that rotates with the sphere.

### Validation

Commands run:

```sh
pnpm --dir apps/web check
pnpm --dir apps/web build
pnpm --dir apps/web smoke
```

Results:

- TypeScript check: passed.
- Vite build: passed, with the existing satellite.js browser-externalization
  and chunk-size warnings.
- Playwright smoke: 7 passed.

Browser checks:

- Desktop viewport `1280x800`: controls are confined to the left pane, render
  pane is nonblank, Earth/orbit imagery is unobscured by UI panels, and meridian
  cues are visible.
- Narrow viewport `390x844`: controls stack above the render pane, the control
  pane scrolls, the render pane remains nonblank, and controls do not overlap
  rendered Earth/orbit imagery.
- Captures saved under `artifacts/goal06-ui-cleanup/`.
- Follow-up captures after meridian simplification:
  `orbit-desktop-static-meridians.png` and
  `orbit-narrow-static-meridians.png`.

## Increment 9: Records, Fixtures, and Completion Pass

Status: implemented.

### Outcome

Goal 06 is closed for this branch around uncertainty visualization,
higher-fidelity ephemeris investigation, UI cleanup, records, and fixtures.

- Deferred the orbit-to-orbit and orbit-to-WEZ intersection probability
  prototypes to a future branch.
- Added top-level [DEFERRED_TASKS.md](../../../DEFERRED_TASKS.md) with the
  high-level plans for those two follow-up prototypes.
- Updated [PLAN.md](PLAN.md) so the active Goal 06 increment list ends with
  this completion pass.
- Updated [README.md](README.md) so the goal acceptance criteria and increment
  list reflect the final local QSW explorer and deferred intersection work.
- Updated stale Increment 2 and spacecraft notes so they point to local QSW
  inspection and later deferred intersection work rather than branch-local
  probability prototypes.
- Kept the Goal 06 fixtures in place:
  [fixtures/orb-sat-1.spacecraft.json](fixtures/orb-sat-1.spacecraft.json) and
  [fixtures/orb-sat-1.synthetic-covariance.json](fixtures/orb-sat-1.synthetic-covariance.json).

### Validation

Commands run:

```sh
uv run pytest
uv run ruff check .
pnpm --dir apps/web check
pnpm --dir apps/web build
pnpm --dir apps/web smoke
```

Results:

- Full pytest suite: 41 passed, 6 skipped.
- Ruff: all checks passed.
- TypeScript check: passed.
- Vite build: passed, with the existing satellite.js browser-externalization
  and chunk-size warnings.
- Playwright smoke: 7 passed.
