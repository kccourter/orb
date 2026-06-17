# Satellite TLE + Three.js Increment Plan

## Goal

Turn the current browser sketch into a clear, typed, deterministic visualization path for an ISS TLE propagated with `satellite.js` and rendered in Three.js.

Each increment should be approved before implementation. The sequence separates propagation math, rendering structure, interaction controls, and validation so later Orekit overlay work has a clean base.

## Increment 1: TLE Propagation Module

### Objective

Move browser-side TLE propagation out of the scene entrypoint and into a typed module.

### Scope

- Add a TypeScript module for TLE inputs, propagation settings, and sampled state outputs.
- Preserve a known ISS TLE as the default fixture.
- Return epoch, source, frame label, position, and velocity metadata for each sample.
- Keep scene rendering behavior unchanged except for calling the new module.

### Expected Files

- New module: `apps/web/src/orbits/tle.ts`
- Possible fixture: `apps/web/src/orbits/fixtures.ts`
- Update: `apps/web/src/main.ts`

### Acceptance Criteria

- TLE propagation can be unit-tested or smoke-tested without constructing a Three.js scene.
- The sample output explicitly labels the coordinate frame used by `satellite.js`.
- Existing orbit trace and marker still render from propagated samples.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- Manual browser smoke test.

### Approval Question

Approve the sample model and frame naming before building more UI around it.

## Increment 2: Scene Composition Layer

### Objective

Separate Three.js scene setup from orbit data generation.

### Scope

- Add scene creation helpers for renderer, camera, lights, Earth, trace, and satellite marker.
- Define scene unit conventions and scale constants in one place.
- Keep the first visual result simple: Earth, one trace, one marker.
- Avoid adding UI panels or API calls in this increment.

### Expected Files

- New module: `apps/web/src/scene/createScene.ts`
- Possible module: `apps/web/src/scene/orbitTrace.ts`
- Update: `apps/web/src/main.ts`

### Acceptance Criteria

- `main.ts` becomes orchestration rather than a pile of scene construction.
- Trace geometry can be replaced later for Orekit overlay without rebuilding the whole app.
- Camera framing is stable for the ISS sample.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`
- Manual browser verification at desktop and narrow viewport sizes if the in-app browser is available.

### Implementation Plan

1. Add scene constants and unit helpers.
   - Define Earth radius, orbit-position scale, camera defaults, and common colors in the scene layer.
   - Keep `satellite.js` samples in kilometers and perform only scene-display scaling at the scene boundary.

2. Add `apps/web/src/scene/createScene.ts`.
   - Export a `createOrbitScene(canvas)` helper that owns renderer, scene, camera, lights, Earth mesh, orbit trace, satellite marker, resize, render, and dispose handles.
   - Keep the public return shape small and explicit so `main.ts` can orchestrate data and animation without knowing geometry setup details.

3. Add `apps/web/src/scene/orbitTrace.ts`.
   - Export helpers to convert typed orbit samples to scene vectors and update trace geometry.
   - Include marker update behavior in the scene API or adjacent trace helper so later Orekit overlay work can add a second trace without changing the scene root.

4. Simplify `apps/web/src/main.ts`.
   - Keep TLE sampling, animation-frame progression, and lifecycle wiring in `main.ts`.
   - Replace direct Three.js setup with calls into the scene composition layer.
   - Preserve current camera framing, colors, Earth size, orbit trace, and satellite marker behavior.

5. Validate.
   - Run `CI=true pnpm --dir apps/web check`.
   - Run `CI=true pnpm --dir apps/web build`.
   - Run `CI=true pnpm --dir apps/web smoke`.
   - If the in-app browser is available, do a quick visual check at desktop and narrow viewport sizes.

### Approval Question

Approve the `createOrbitScene` plus `orbitTrace` module boundary before implementation.

## Increment 3: Deterministic Epoch and Sampling Controls

### Objective

Make sampling reproducible and adjustable without turning the app into a full dashboard.

### Scope

- Add fixed default epoch, duration, and step-size configuration.
- Add compact controls for epoch reset, duration, and step size if the UI remains clean.
- Recompute the trace when settings change.
- Keep the default path deterministic for tests and screenshots.

### Expected Files

- `apps/web/src/main.ts`
- Possible module: `apps/web/src/state/orbitSettings.ts`
- Possible module: `apps/web/src/ui/controls.ts`

### Acceptance Criteria

- A reload produces the same trace for the same default epoch.
- Users can change sampling basics without editing source.
- Invalid control values are clamped or rejected in a predictable way.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`
- Manual browser test of sample settings if the in-app browser is available.

### Implementation Plan

1. Add orbit settings state.
   - Create `apps/web/src/state/orbitSettings.ts` with a deterministic default epoch, duration, and step size.
   - Use an ISO UTC string for the default epoch so reloads produce the same sampled trace.
   - Derive sample count from `durationMinutes` and `stepSeconds`, with clamping for valid ranges.

2. Add compact DOM controls.
   - Create `apps/web/src/ui/controls.ts` for a small control surface over the canvas.
   - Include epoch display/edit, reset-to-default epoch, duration minutes, and step seconds.
   - Keep the UI plain DOM and CSS; do not introduce a component framework or dashboard layout.

3. Recompute orbit samples on settings changes.
   - Keep `main.ts` responsible for orchestration: current settings, TLE sampling, trace update, marker animation index reset.
   - Reuse `sampleTleOrbit`, `orbitSamplesToScenePoints`, and `orbitScene.setOrbitPoints`.
   - Clamp or reject invalid inputs predictably before sampling.

4. Update styles.
   - Add a compact fixed control bar or panel that does not obscure the main orbit view.
   - Keep text and controls readable on narrow viewports without changing the scene layout.

5. Extend smoke coverage where practical.
   - Keep the existing nonblank canvas assertion.
   - Add a lightweight Playwright interaction check that changing duration or step recomputes without blanking the scene.
   - Avoid brittle visual assertions about exact pixel positions until the epoch and camera are fully frozen.

6. Validate.
   - Run `CI=true pnpm --dir apps/web check`.
   - Run `CI=true pnpm --dir apps/web build`.
   - Run `CI=true pnpm --dir apps/web smoke`.
   - If the in-app browser is available, manually try reset epoch and sample-setting changes at desktop and narrow widths.

### Approval Question

Approve the deterministic defaults and compact DOM control surface before implementation.

## Increment 4: Frontend Validation and Visual QA Notes

### Objective

Record the checks that prove Goal 01 is ready to support Orekit integration.

### Scope

- Add or update goal notes with launch, build, and smoke-test steps.
- Capture known frame assumptions and scene unit conventions.
- Run the frontend checks available in the local environment.
- If practical, use the in-app browser to confirm the scene is nonblank and framed correctly.

### Expected Files

- `docs/goals/01-satellite-tle-threejs/README.md`
- Possible new file: `docs/goals/01-satellite-tle-threejs/RECORD.md`

### Acceptance Criteria

- The goal has a short completion record with commands run and remaining risks.
- Later goals can rely on documented sample shape, frame label, and scene units.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- Browser smoke test.

### Approval Question

Approve the completion record before moving to Goal 02.

## Open Decisions

- Frame label for `satellite.js` output: likely `TEME`, but the exact wording should be explicit.
- Whether UI controls are plain DOM or a small component/state layer.
- Whether to add a test runner now or defer frontend unit tests until divergence math appears.
- Whether Earth remains a simple mesh or gets texture/assets in this first goal.

## Not In Scope

- Orekit API calls.
- Dual-trace comparison.
- Frame conversion controls.
- Scenario loading.
