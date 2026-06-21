# Orekit + Three.js Migration Handoff

## Purpose

This is a handoff for transplanting a long-running GMAT/Cesium-based project onto the stack explored in Orb Lab: Python + Orekit JPype for authoritative propagation, `satellite.js` for browser-side TLE previews, and Three.js for custom visualization. Treat this as a dense migration map rather than a general architecture essay.

The important lesson from Orb Lab is that this stack works best when each tool has a narrow job:

- Orekit owns authoritative orbital mechanics, frames, time scales, event work, maneuvers, CCSDS/OEM handling, and anything that must survive scrutiny.
- Three.js owns the custom app experience: rendering, scene graph, overlays, camera behavior, picking, timelines, and visual diagnostics.
- `satellite.js` owns fast browser-side TLE previews and SGP4/TLE comparison behavior, not high-fidelity mission truth.
- Python/FastAPI owns normalization and propagation APIs between the authoritative engine and the app.

Do not recreate Cesium's worldview in Three.js. The migration is worth doing because Three.js makes it easier to build a bespoke operational scene, while Orekit is better suited than a brittle GMAT install path for embedding serious astrodynamics into a custom application.

## Migration Posture

Rip the stack over in vertical slices, not by attempting a full replacement behind the scenes. The first successful milestone should be a local app showing one real object from one real source, with explicit frame labels and a repeatable validation command.

Recommended migration sequence:

1. Freeze the old GMAT/Cesium project as a reference system.
2. Inventory the old project's scenario inputs, propagated outputs, frame assumptions, unit conventions, visual layers, and user workflows.
3. Stand up the new toolchain with a minimal FastAPI + Vite + Three.js skeleton.
4. Port one source type first, probably TLE if it exists, otherwise the simplest OEM/initial-state path.
5. Add the Orekit propagation endpoint and return sampled PV data as JSON.
6. Render the samples in Three.js with deterministic camera, scale, and smoke tests.
7. Add comparison traces against the old project only when frames, epochs, and units are explicit.
8. Move workflow features one at a time: source loading, frame selection, timeline, overlays, events, maneuvers, exports.
9. Delete or quarantine old GMAT/Cesium integration paths as soon as their replacements are verified.

Avoid a temporary hybrid where GMAT still produces core data while the new app renders it indefinitely. That hybrid can be useful for verification, but it should not become the new architecture.

## Canonical Boundaries

### Authoritative Propagation

Use Python plus `orekit-jpype`. Build a service layer around Orekit; do not let frontend code know Orekit object model details.

Good backend boundaries:

- `orekit_runtime.py`: JVM and Orekit data initialization.
- `frames.py`: exact frame resolution and transformations.
- `propagation.py`: propagator construction and sampling.
- `scenarios.py`: source parsing and normalization.
- `models.py`: API contracts.
- `api.py`: thin FastAPI routes.

The JVM is process-global. Design runtime initialization as a one-way operation inside each Python process. Do not rely on being able to tear down and restart JPype cleanly during tests, hot reloads, or API lifecycle events.

### Browser Preview

Use `satellite.js` only where its behavior is actually the desired behavior: quick TLE rendering, interaction latency, and comparison to browser-side SGP4. Keep its samples labeled as `TEME`, in kilometers and kilometers per second.

Do not use `satellite.js` as a general propagation abstraction. It is not a replacement for Orekit force models, events, maneuvers, frame handling, or CCSDS-oriented workflows.

### Rendering

Use Three.js directly. Keep scene objects and orbit traces explicit:

- one trace ID per source or mode;
- one clear scale conversion at the scene boundary;
- one selected frame for the active display;
- separate geometry update functions from API and UI code;
- deterministic sampling defaults so rendering can be smoke-tested.

In Orb Lab, scene display scale is `1 Three.js unit = 1,000 km`, Earth radius is `6.371` scene units, and orbit samples remain in kilometers until they cross the rendering boundary.

## Toolchain Defaults

Use the boring, pinned toolchain. The old project already suffered from machine re-imaging and install drift; this migration should make environment rebuilds routine.

Recommended defaults:

- Python `3.14` managed by `uv`.
- Python package under `src/<project_package>`.
- FastAPI API with a console script, plus direct `uvicorn` command for local smoke tests.
- `orekit-jpype` for Orekit access.
- Local Orekit data under the repo or a documented local artifact path.
- TypeScript + Vite + Three.js under `apps/web`.
- `pnpm` via Corepack, pinned in root `package.json`.
- Playwright for browser smoke tests.

Keep uv caches and Python installs local where possible:

```sh
export UV_CACHE_DIR="$PWD/.uv-cache"
export UV_PYTHON_INSTALL_DIR="$PWD/.uv-python"
uv python install cpython-3.14.5-macos-aarch64-none
uv venv --python 3.14
uv sync --extra dev
```

Keep Orekit data explicit:

```sh
export OREKIT_DATA_PATH="$PWD/orekit-data.zip"
uv run uvicorn <package>.api:app --host 127.0.0.1 --port 8000
```

Use the app runner outside sandbox constraints if reload watchers misbehave. In Orb Lab, the console script is normal for humans, while direct `uvicorn` was easier for local automation.

For JavaScript:

```sh
corepack enable
corepack prepare pnpm@11.7.0 --activate
pnpm install
pnpm --dir apps/web dev
```

## API Design

Keep the API small and explicit. The frontend should ask for sampled states, not ask Orekit questions.

Useful initial endpoints:

- `GET /healthz`: must not initialize Orekit.
- `POST /propagate/tle`: explicit TLE propagation with sampling settings and requested frame.
- `GET /scenarios/examples`: bundled examples.
- `GET /scenarios/examples/{id}`: normalized example scenario.
- `POST /scenarios/normalize`: parse user-provided source text or JSON into a normalized scenario.

Good propagation response shape:

- source metadata;
- exact frame name;
- position units;
- velocity units;
- sampling settings;
- array of samples, each with ISO epoch, position vector, and velocity vector.

Use inclusive sampling unless there is a strong product reason not to:

```text
sample_count = floor(duration_seconds / step_seconds) + 1
```

Frontend comparison code must align samples by epoch, not by array index. Even a one-sample cadence mismatch can make index comparison look like a dynamics problem.

## Scenario Normalization

Normalize source data before propagation. This is the cleanest replacement for ad hoc GMAT/Cesium ingestion glue.

Minimum normalized scenario concepts:

- source type: `tle`, `oem_ccsds`, `initial_state`, later others if needed;
- source format and raw source traceability;
- object ID and display name if available;
- exact frame;
- origin;
- units;
- epoch;
- TLE lines, initial state, or ephemeris samples;
- propagation intent if source and propagation are separate operations.

Recommended TypeScript-level shape:

```ts
type ScenarioSourceType = "tle" | "oem_ccsds" | "initial_state";
type ScenarioFrame = "TEME" | "EME2000" | "ITRF" | "QSW";

type NormalizedScenario = {
  id?: string;
  name: string;
  source: {
    type: ScenarioSourceType;
    format: string;
    objectId?: string;
    raw?: string;
  };
  frame: {
    name: ScenarioFrame;
    origin: "geocentric" | "spacecraft";
  };
  units: {
    position: "km";
    velocity: "km/s";
  };
  epoch?: string;
  tle?: {
    line1: string;
    line2: string;
  };
  initialState?: {
    epoch: string;
    positionKm: [number, number, number];
    velocityKmS: [number, number, number];
  };
  samples?: Array<{
    epoch: string;
    positionKm: [number, number, number];
    velocityKmS: [number, number, number];
  }>;
};
```

Python should own real parsing and normalization. The browser can do lightweight validation and user feedback, but it should not duplicate CCSDS/OEM parsing rules.

## Frames And Units

This is the migration area most likely to create subtle false results. Be exact everywhere.

Use exact frame identifiers:

- `TEME`: TLE/SGP4-native comparison frame.
- `EME2000`: explicit inertial display frame, UI can label it as `ECI (EME2000)`.
- `ITRF`: explicit Earth-fixed display frame, UI can label it as `ECEF (ITRF)`.
- `QSW`: spacecraft-centered local orbital frame.
- `native`: propagation request compatibility mode only.

Do not accept broad frame names like `ECI` or `ECEF` in scenario data. If old project files use those words, loaders must map them to exact supported frames or reject them with an actionable error.

Policy that worked in Orb Lab:

- `native` is allowed as a propagation request, not as a scenario source frame.
- TLE scenarios normalize to `TEME`, geocentric origin, kilometers, kilometers per second.
- Browser-side `satellite.js` samples remain `TEME`.
- Orekit can return `TEME`, `EME2000`, `ITRF`, or `QSW`.
- Divergence metrics are shown only when frame labels and units match.
- For non-comparable display frames, render the requested Orekit samples and mark comparison metrics unavailable.
- QSW is spacecraft-centered; do not render it as if it were a geocentric orbit trace.

Keep all API state vectors in kilometers and kilometers per second unless a legacy interface absolutely requires something else. Convert source meters to kilometers in loaders. Convert kilometers to Three.js display units only at the scene boundary.

## Frontend App Shape

Favor compact operational controls over dashboard or marketing patterns. This migration is for a custom mission app, not a landing page.

Useful frontend modules:

- `api/propagation.ts`: typed API client.
- `config.ts`: API base URL from `VITE_*`.
- `orbits/tle.ts`: browser-side TLE preview.
- `orbits/sampleTypes.ts`: common sample shape.
- `orbits/alignment.ts`: epoch-based alignment.
- `orbits/divergence.ts`: comparison math and formatting.
- `scene/createScene.ts`: Three.js scene creation and trace registry.
- `scene/orbitTrace.ts`: geometry conversion and updates.
- `state/orbitSettings.ts`: deterministic sampling defaults.
- `state/frameSettings.ts`: selected frame and display/comparison mode.
- `ui/*Controls.ts`: small DOM controls near the canvas.
- `main.ts`: orchestration only.

UX pattern that worked:

- local `satellite.js` trace renders immediately;
- Orekit trace refresh is manual at first;
- API failure preserves the local scene;
- changing sampling or frame clears stale Orekit samples and stale divergence metrics;
- legend labels trace source and frame;
- readout reports current, max, mean divergence, aligned count, and unmatched counts;
- frame selection makes display mode explicit.

Manual refresh is a feature during migration. It prevents every UI tweak from becoming a propagation request and makes stale state easier to reason about.

## Three.js Rendering Tips

Keep rendering boring and testable first:

- use stable dimensions for the canvas shell;
- set a deterministic initial camera;
- render Earth and the first trace before adding visual polish;
- use one scale function for converting km to scene units;
- clear and recreate trace geometries intentionally when sample sets change;
- keep marker animation tied to the currently displayed sample set;
- verify desktop and narrow viewport canvas output.

Canvas smoke tests should check that the canvas is nonblank after initial render, after setting changes, and after API refresh. A blank WebGL canvas should fail CI.

Avoid treating Cesium features as requirements by default. Rebuild only what the app actually needs: custom camera controls, overlays, picking, event markers, timeline scrubbing, uncertainty display, sensor cones, ground tracks, etc.

## Orekit Runtime Notes

Important runtime policies:

- Importing the API module should not start the JVM.
- `GET /healthz` should not start the JVM.
- Orekit data is required for real TLE propagation because UTC/leap-second history is needed.
- Runtime initialization alone may not need Orekit data, but real propagation will.
- Tests without `OREKIT_DATA_PATH` should skip data-enabled propagation checks cleanly.
- Data-enabled adapter tests are preferable to long-lived FastAPI `TestClient` tests that start the JVM inside the test process.

In Orb Lab, JPype with Java 25 emitted a native-access warning during JVM startup; propagation still worked. Do not let that warning mask real missing-data failures, but do not panic if it appears.

## Validation Strategy

Run checks according to touched files:

```sh
uv run pytest
uv run ruff check .
CI=true pnpm --dir apps/web check
CI=true pnpm --dir apps/web build
CI=true pnpm --dir apps/web smoke
```

Data-enabled backend validation:

```sh
UV_CACHE_DIR="$PWD/.uv-cache" OREKIT_DATA_PATH="$PWD/orekit-data.zip" uv run pytest
```

Live local validation:

```sh
UV_CACHE_DIR="$PWD/.uv-cache" OREKIT_DATA_PATH="$PWD/orekit-data.zip" uv run uvicorn <package>.api:app --host 127.0.0.1 --port 8000
pnpm --dir apps/web dev
```

Useful test coverage:

- model validation for exact frames and units;
- parser tests for TLE, OEM/CCSDS, and initial-state scenarios;
- Orekit runtime tests that confirm lazy initialization;
- data-enabled propagation tests gated by `OREKIT_DATA_PATH`;
- API route tests for 200, 400, 422, and 503 behavior;
- frontend fixture checks for epoch alignment and divergence;
- Playwright smoke with mocked Orekit responses;
- at least one manual live API-to-browser check before major milestones.

Expect Vite production builds to warn about some `satellite.js` browser externalization and chunk size issues. In Orb Lab, those warnings did not block the build. Track them, but do not treat them as migration blockers unless they become runtime failures.

## Old GMAT/Cesium Mapping

Likely replacements:

- GMAT scripts or generated ephemerides become scenario inputs plus Orekit propagation services.
- GMAT force-model assumptions become explicit Orekit propagator configuration records.
- GMAT report files become fixtures for regression comparison during migration.
- Cesium CZML becomes optional export, not the primary UI representation.
- Cesium clock/timeline becomes app-owned time state.
- Cesium entities become Three.js scene objects with explicit ownership.
- Cesium globe-first rendering becomes optional Earth and ground-layer rendering in Three.js.
- Ad hoc coordinate labels become exact frame metadata in every sample set.

Do not try to port GMAT scripts line-for-line. Extract their intent: initial states, force models, maneuvers, events, coordinate systems, output cadence, and operational workflow. Then model that intent in Orekit and the app.

## First Vertical Slice

Good first slice:

1. New repo branch and migration plan.
2. Minimal Python package with FastAPI and `/healthz`.
3. Orekit runtime wrapper with lazy initialization.
4. One propagation endpoint for the easiest legacy source.
5. One bundled example scenario.
6. Vite + Three.js scene rendering Earth and one trace.
7. Playwright nonblank canvas smoke.
8. README with exact local setup commands and `OREKIT_DATA_PATH`.

Acceptance criteria:

- a fresh machine can rebuild the environment from documented commands;
- one scenario propagates through Orekit;
- the browser renders it without Cesium;
- the API response labels exact frame and units;
- validation commands pass;
- the old project output for the same scenario is archived for comparison.

## Migration Risks

Big risks to surface early:

- Hidden frame assumptions in the old project, especially generic `ECI`/`ECEF`.
- Unit drift between meters, kilometers, seconds, and display scale.
- Treating TLE/TEME output as a generic inertial truth source.
- JVM lifecycle surprises in hot reload or test processes.
- Orekit data missing after clean machine setup.
- Over-porting Cesium abstractions into Three.js.
- Attempting high-fidelity force-model parity before the app has a stable source/rendering loop.
- Comparing traces by index instead of epoch.
- Letting a temporary GMAT bridge remain authoritative too long.

The migration should be documented as implementation records, not only plans. For each increment, record commands run, frame and unit assumptions, fixture sources, numerical comparison notes, and unresolved risks.

## Practical Defaults To Carry Forward

- Use exact frame names in API and stored scenario data.
- Keep source normalization server-side.
- Keep browser preview and authoritative propagation visibly separate.
- Keep sample data in km and km/s across the API.
- Convert to scene units only inside rendering code.
- Clear stale remote samples on setting changes.
- Make API failures nonfatal to the local browser scene.
- Start with manual Orekit refresh.
- Align comparable samples by epoch.
- Show comparison metrics only when frames and units match.
- Add live Orekit checks only where `OREKIT_DATA_PATH` is available.
- Treat docs and validation commands as part of the migration deliverable.

## Orb Lab References

Use these files as source patterns:

- `README.md`: stack and local setup defaults.
- `docs/tooling-notes.md`: tool selection rationale.
- `docs/goals/01-satellite-tle-threejs/RECORD.md`: first browser TLE + Three.js loop.
- `docs/goals/02-orekit-pv-endpoint/RECORD.md`: Orekit runtime and TLE API.
- `docs/goals/03-trace-divergence-overlay/RECORD.md`: browser/API comparison path.
- `docs/goals/04-frame-controls/FRAMES.md`: frame policy.
- `docs/goals/04-frame-controls/RECORD.md`: frame-aware propagation and UI behavior.
- `docs/goals/05-data-loader-path/PLAN.md`: scenario loader direction.
