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
- Manual browser verification at desktop and narrow viewport sizes.

### Approval Question

Approve the scene module boundaries before adding controls.

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
- Manual browser test of sample settings.

### Approval Question

Approve the minimal control surface before adding validation notes.

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
