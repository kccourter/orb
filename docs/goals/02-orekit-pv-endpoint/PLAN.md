# Orekit PV Endpoint Increment Plan

## Goal

Add a Python API path that returns sampled Orekit position-velocity coordinates for the same object and time range used by the browser visualization.

Each increment should be approved before implementation. The increments are ordered to keep API shape, Orekit lifecycle, propagation behavior, and frontend integration boundaries separate.

## Branch Goal

Build the first authoritative propagation service path for TLE sampling without touching the Goal 01 browser rendering flow. The branch should end with a documented `POST /propagate/tle` endpoint that accepts the same deterministic ISS TLE and sampling window used by the web app, returns finite sampled PV vectors with explicit units and frame metadata, and can be exercised by tests plus one local API smoke command.

## Starting Context

- Goal 01 uses `satellite.js` in the browser for deterministic preview samples.
- The default browser sampling settings are epoch `2024-06-21T13:31:24Z`, duration `92.5` minutes, and step `30` seconds.
- Goal 01 labels browser-side samples as `TEME`, with positions in kilometers and velocities in kilometers per second.
- The current Python API has `GET /healthz` and `GET /propagate/demo`, where `/propagate/demo` is a circular-orbit placeholder.
- `orekit-jpype[jdk4py]` is already a project dependency, but no Orekit bootstrap or propagation adapter exists yet.

## Proposed Contract Defaults

- Endpoint: `POST /propagate/tle`.
- Request source shape: explicit TLE lines and optional display name, not a broad scenario union yet.
- Time inputs: ISO 8601 UTC `start_epoch`, numeric `duration_minutes`, numeric `step_seconds`.
- Units: API responses use `km` and `km/s`; Orekit adapter internals may use SI and convert at the boundary.
- Frame for Goal 02: return the Orekit TLE propagator's native frame name explicitly. Do not market this as generic `ECI`, and do not transform to match Goal 01 `TEME` unless Orekit confirms that frame output directly.
- Sample count: include both request settings and response metadata so Goal 03 can align epochs before comparing traces.
- Existing route policy: keep `GET /propagate/demo` during Goal 02 as a harmless placeholder/demo endpoint unless it conflicts with a cleaner route structure later.

## Increment 1: API Contract and Models

### Objective

Define the request and response contract without invoking Orekit.

### Scope

- Add Pydantic models for propagation requests, TLE input, sampling window, frame name, and sampled state vectors.
- Decide canonical API units: kilometers for position, kilometers per second for velocity, ISO 8601 UTC strings for epochs.
- Add the `POST /propagate/tle` route shape with a clear `501` until Orekit propagation lands.
- Keep the existing demo endpoint intact unless it is explicitly replaced later.

### Expected Files

- `src/orb_lab/api.py`
- Possible new module: `src/orb_lab/models.py`
- Possible tests: `tests/test_api_models.py`

### Acceptance Criteria

- Request and response JSON shapes are stable enough for frontend work.
- Invalid duration, step size, malformed epoch, and malformed TLE payloads fail with useful validation errors.
- `POST /propagate/tle` is documented as the Goal 02 endpoint.
- Tests cover model validation and the temporary not-implemented route behavior.

### Implementation Plan

1. Move shared API data shapes out of `api.py`.
   - Add `src/orb_lab/models.py` for TLE request, sampling request, vector, sample, metadata, and response models.
   - Keep models small and JSON-friendly so the frontend can mirror them later without knowing Orekit classes.

2. Define validation limits.
   - Match Goal 01 defaults while allowing a modest range for experiments.
   - Validate that TLE line 1 and line 2 are non-empty and look like separate TLE lines; save deeper orbital validity for the Orekit adapter.

3. Add the route stub.
   - Add `POST /propagate/tle` in `src/orb_lab/api.py`.
   - Return `501 Not Implemented` with a stable error body until Increment 3/4 wires real propagation.

4. Add focused tests.
   - Exercise valid model construction, invalid sampling values, malformed epochs, and the route stub.
   - Keep tests JVM-free in this increment.

### Validation

- `uv run ruff check .`
- `uv run pytest`
- Manual OpenAPI inspection at `/docs` when the API is running.

### Approval Question

Approve the API shape before wiring it to Orekit.

## Increment 2: Orekit Runtime Bootstrap

### Objective

Centralize JVM and Orekit initialization so route handlers do not manage runtime state directly.

### Scope

- Add an Orekit bootstrap module responsible for starting JPype once.
- Locate `jdk4py` Java runtime and initialize Orekit through `orekit_jpype`.
- Defer `orekit-data/` as optional for the first TLE-only endpoint if Orekit TLE propagation can run without it; otherwise fail with a clear setup error.
- Return explicit startup/configuration errors that the API can translate into HTTP responses.

### Expected Files

- New module: `src/orb_lab/orekit_runtime.py`
- Possible test: `tests/test_orekit_runtime.py`
- Documentation update in this goal folder if Orekit data policy is decided.

### Acceptance Criteria

- Repeated calls to the bootstrap function are idempotent.
- JVM lifecycle details are isolated from FastAPI routes.
- Missing Orekit data behavior is explicit and testable.
- Importing `orb_lab.api` does not automatically start the JVM.

### Implementation Plan

1. Add `src/orb_lab/orekit_runtime.py`.
   - Provide an `ensure_orekit()` function that initializes Java/Orekit once and returns a small runtime status object or raises a project-specific configuration error.
   - Keep JPype/JVM details contained here.

2. Decide the data lookup behavior while implementing.
   - First try a no-data TLE bootstrap if Orekit supports the needed path.
   - If data is required, look for an explicit local path such as `OREKIT_DATA_PATH` and document that requirement.

3. Add idempotence tests.
   - Use light tests for repeated calls and error mapping where possible.
   - Avoid relying on JVM restart behavior in a single Python process.

### Validation

- `uv run python -c 'from orb_lab.orekit_runtime import ensure_orekit; ensure_orekit(); print("ok")'`
- `uv run ruff check .`
- `uv run pytest`

### Approval Question

Approve the runtime/data policy before adding propagation logic.

## Increment 3: TLE Propagation Adapter

### Objective

Implement the first real Orekit propagation path for a supplied TLE and sampling window.

### Scope

- Add a propagation adapter that converts request models into Orekit objects.
- Use Orekit TLE propagation for the ISS test case and any valid supplied TLE.
- Sample PV coordinates at `start_epoch + n * step_seconds` through the requested duration.
- Convert Orekit SI values to API units.
- Include source metadata, frame metadata, and sample count metadata in the response.
- Keep generated sample epochs aligned with the request cadence so Goal 03 can compare by exact timestamp.

### Expected Files

- New module: `src/orb_lab/propagation.py`
- Possible updates: `src/orb_lab/api.py`, `src/orb_lab/models.py`
- Tests: `tests/test_tle_propagation.py`

### Acceptance Criteria

- A known ISS TLE returns a non-empty sequence of state vectors.
- The number of samples matches the requested duration and step size.
- Position and velocity values are finite and unit-converted.
- The adapter does not start or restart the JVM directly.
- Response metadata names the propagation source and the actual Orekit output frame.

### Implementation Plan

1. Add `src/orb_lab/propagation.py`.
   - Convert validated request models into Orekit TLE and propagation objects.
   - Call the runtime bootstrap rather than importing or starting JPype directly inside the adapter.

2. Implement deterministic sampling.
   - Use inclusive sampling from `start_epoch` through `duration_minutes` at `step_seconds` cadence.
   - Avoid wall-clock defaults in the adapter; callers must provide the start epoch.

3. Convert units at the API boundary.
   - Return positions in kilometers and velocities in kilometers per second.
   - Keep response vector keys explicit, such as `position_km` and `velocity_km_s`.

4. Add propagation tests.
   - Use the Goal 01 ISS fixture values and default sampling settings.
   - Assert finite vector values, sample count, epoch order, and metadata.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- Manual API call against `POST /propagate/tle`.

### Approval Question

Approve the first propagation adapter before route polish and frontend-facing error behavior.

## Increment 4: Route Integration and Error Handling

### Objective

Connect the propagation adapter to FastAPI with clear operational behavior.

### Scope

- Wire `POST /propagate/tle` to the Orekit adapter.
- Map domain/runtime errors to stable HTTP status codes.
- Add request examples for the OpenAPI docs.
- Add tests for successful propagation and common failure cases.
- Consider whether a lightweight `/orekit/healthz` endpoint is useful.
- Preserve `GET /healthz` as a process health check that does not require Orekit initialization.

### Expected Files

- `src/orb_lab/api.py`
- `tests/test_api_propagation.py`
- Possible documentation update: `docs/goals/02-orekit-pv-endpoint/README.md`

### Acceptance Criteria

- Valid TLE propagation works through HTTP.
- Invalid TLEs return a useful `422` or `400`.
- Runtime configuration failures return a clear `503`.
- Response payload includes enough metadata for the frontend to compare with `satellite.js`.
- OpenAPI docs show an ISS-like example payload.

### Implementation Plan

1. Replace the route stub with real adapter wiring.
   - Keep route handlers thin: validate, call adapter, map errors.
   - Keep project-specific exceptions in one small module if the taxonomy becomes clearer than raw library exceptions.

2. Add HTTP error behavior.
   - Use FastAPI/Pydantic `422` for schema and basic field validation.
   - Use `400` for orbital-domain errors such as invalid TLE content after schema validation.
   - Use `503` when Orekit/JVM/runtime setup prevents propagation.

3. Add API tests.
   - Cover successful ISS propagation through FastAPI's test client.
   - Cover invalid TLE content and runtime failure mapping without making tests restart the JVM.

4. Add one local smoke command.
   - Run `orb-api` or `uv run orb-api` locally and call `POST /propagate/tle` with the Goal 01 ISS fixture and defaults.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- Curl smoke test against a running API.

### Approval Question

Approve the HTTP behavior before adding docs and cross-goal handoff notes.

## Increment 5: Documentation and Handoff to Overlay Goal

### Objective

Document how to run and consume the endpoint, then capture decisions needed by the trace overlay goal.

### Scope

- Add local API usage examples with curl payloads.
- Record frame, unit, epoch, and sample alignment decisions.
- Update README only if the developer workflow or architecture description changes.
- Add notes for Goal 03 about how to request matching Orekit samples from the frontend.
- Add a completion record with commands run, runtime/data assumptions, and risks.

### Expected Files

- `docs/goals/02-orekit-pv-endpoint/README.md`
- Possible new file: `docs/goals/02-orekit-pv-endpoint/API.md`
- Possible new file: `docs/goals/02-orekit-pv-endpoint/RECORD.md`
- Possible update: `docs/goals/03-trace-divergence-overlay/README.md`
- Possible update: `README.md`

### Acceptance Criteria

- A developer can start the API and run one documented request locally.
- Goal 03 has a clear input contract for overlay work.
- Stale placeholder language is removed from touched docs.
- The completion record states whether `orekit-data/` is required for the implemented endpoint.

### Implementation Plan

1. Document the endpoint.
   - Include request and response examples for the Goal 01 ISS TLE and default sampling settings.
   - Call out exact units, frame label behavior, and sample-count behavior.

2. Add a completion record.
   - Record validation commands, curl smoke result, known warnings, and remaining risks.
   - Note whether JVM-backed tests run by default.

3. Update cross-goal notes.
   - Add Goal 03 handoff notes for frontend client shape, epoch alignment, and frame comparison caveats.
   - Keep broader README updates scoped to actual developer workflow changes.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- Manual documented curl command.

### Approval Question

Approve documentation and handoff notes before considering the goal complete.

## Open Decisions

- Exact Orekit frame label: return the actual Orekit output frame name once verified during Increment 3.
- Orekit data policy: defer `orekit-data/` for the first TLE-only endpoint if the implemented Orekit path supports it; otherwise document the required local setup.
- Test strategy: decide how much JVM-backed testing should run by default versus behind a marker.
- Error taxonomy: decide whether to introduce project-specific exception types before or during route integration.

## Not In Scope

- Browser overlay work.
- Frame controls.
- OEM/CCSDS loading.
- Non-TLE propagation models.
- Maneuvers, force-model configuration, or event detection.
