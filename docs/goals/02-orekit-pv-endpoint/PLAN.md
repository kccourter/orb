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

## Draft API Shape

Request:

```json
{
  "tle": {
    "name": "ISS (ZARYA)",
    "line1": "1 25544U 98067A   24173.56347222  .00020137  00000+0  35155-3 0  9993",
    "line2": "2 25544  51.6390 336.0970 0007833  50.2065  79.8843 15.50417852458913"
  },
  "sampling": {
    "start_epoch": "2024-06-21T13:31:24Z",
    "duration_minutes": 92.5,
    "step_seconds": 30
  },
  "frame": "native"
}
```

Response:

```json
{
  "source": {
    "type": "tle",
    "name": "ISS (ZARYA)",
    "propagator": "orekit-tle"
  },
  "frame": {
    "name": "TO_BE_VERIFIED",
    "authority": "orekit",
    "is_native": true
  },
  "units": {
    "position": "km",
    "velocity": "km/s"
  },
  "sampling": {
    "start_epoch": "2024-06-21T13:31:24Z",
    "duration_minutes": 92.5,
    "step_seconds": 30,
    "sample_count": 186
  },
  "samples": [
    {
      "epoch": "2024-06-21T13:31:24Z",
      "position_km": [0.0, 0.0, 0.0],
      "velocity_km_s": [0.0, 0.0, 0.0]
    }
  ]
}
```

Error shape:

```json
{
  "error": {
    "code": "orekit_unavailable",
    "message": "Orekit runtime is not available."
  }
}
```

The exact field names may be adjusted during Increment 1 if the Pydantic model reads more cleanly, but the contract should preserve these concepts: explicit source, frame, units, sampling metadata, and sample vectors.

## Validation And Test Strategy

- Contract-only tests must not initialize the JVM.
- Runtime bootstrap tests may initialize the JVM once, but must not depend on restarting it.
- Propagation tests should use the Goal 01 ISS TLE and default sampling window.
- HTTP tests should use FastAPI's test client for status codes and response shape.
- A final manual smoke should start the API with `uv run orb-api` and call `POST /propagate/tle`.
- If JVM-backed tests are too slow or environment-sensitive, introduce a pytest marker and document which checks run by default.

## Increment Dependency Map

1. Increment 1 freezes the JSON contract and route name.
2. Increment 2 proves the process can initialize Orekit safely.
3. Increment 3 produces sampled vectors outside FastAPI route handlers.
4. Increment 4 exposes the adapter through HTTP and stabilizes errors.
5. Increment 5 records how Goal 03 should consume the endpoint.

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

### Planned Model Details

- `TleInput`: `name`, `line1`, `line2`.
- `SamplingRequest`: `start_epoch`, `duration_minutes`, `step_seconds`.
- `PropagationFrameRequest`: initially allow only `native`.
- `TlePropagationRequest`: `tle`, `sampling`, `frame`.
- `Vector3`: either a tuple alias or model used for position and velocity fields.
- `PropagationSample`: `epoch`, `position_km`, `velocity_km_s`.
- `PropagationResponse`: `source`, `frame`, `units`, `sampling`, `samples`.
- `ErrorResponse`: stable shape for route-level non-Pydantic errors.

### Increment Completion Notes

- Leave a TODO or comment only if the route stub still returns `501`.
- Record any contract field rename in this plan before proceeding to Increment 2.
- Do not add Orekit imports in this increment.

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

### Runtime Investigation Steps

1. Verify the import names and initialization sequence for `orekit_jpype` and `jdk4py` in the local environment.
2. Confirm whether Orekit TLE construction and propagation require `orekit-data/` for this endpoint.
3. Capture the actual frame name exposed by Orekit TLE propagation for the sampled PV coordinates.
4. Decide whether a runtime status object should include Java version, Orekit version, data path, and initialized state.

### Increment Completion Notes

- Verified during Increment 2: Orekit/JPype bootstrap succeeds with the bundled `jdk4py` runtime when `JAVA_HOME` and `jvmpath` are set from `jdk4py`; no `OREKIT_DATA_PATH` is required for runtime initialization alone.
- TLE construction and propagation data requirements remain to be verified during Increment 3.
- Do not wire the runtime into FastAPI route handlers yet except for isolated health/status experiments if explicitly approved.

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

### Sampling Rules

- Use the request `start_epoch` as sample zero.
- Use `floor(duration_seconds / step_seconds) + 1` samples for an inclusive end-window cadence.
- For the Goal 01 default of `92.5` minutes and `30` seconds, expect `186` samples.
- Preserve the exact requested cadence in response metadata even if the final sample falls at or before the duration boundary.
- Return epochs as UTC ISO 8601 strings with seconds precision unless Orekit requires more precision.

### Adapter Error Cases

- Invalid TLE checksum or parse failure.
- Propagation failure for a requested epoch.
- Non-finite vector components after unit conversion.
- Unsupported frame request.
- Runtime unavailable from the Orekit bootstrap layer.

### Increment Completion Notes

- Record the actual Orekit frame label found during implementation.
- Add a small numerical sanity range to tests, such as ISS position magnitude near low-Earth-orbit scale, without pinning brittle exact values before the frame policy is final.

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

### Planned Error Mapping

- `422`: JSON schema, type, bounds, malformed datetime, or missing fields.
- `400`: TLE parses as request data but is not a valid propagatable TLE.
- `422` or `400`: unsupported `frame`, depending on whether it is rejected by model validation or adapter validation.
- `503`: JVM, Java runtime, Orekit initialization, or required data path unavailable.
- `500`: unexpected errors only; include a generic public message and keep implementation details in logs.

### HTTP Smoke Payload

Use the same request shown in the Draft API Shape section. The smoke passes when:

- HTTP status is `200`.
- `samples` is non-empty.
- `sampling.sample_count` matches `len(samples)`.
- The first sample epoch equals `2024-06-21T13:31:24Z`.
- Position and velocity arrays contain three finite numbers.

### Increment Completion Notes

- If `/orekit/healthz` is added, keep its purpose separate from `GET /healthz`: it may initialize Orekit and report runtime readiness.
- Do not add frontend API calls in this increment.

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

### Documentation Checklist

- `docs/goals/02-orekit-pv-endpoint/API.md` includes route, request, response, errors, and curl example.
- `docs/goals/02-orekit-pv-endpoint/RECORD.md` includes completed increments, commands run, runtime/data policy, frame label, and remaining risks.
- `docs/goals/02-orekit-pv-endpoint/README.md` no longer describes undecided behavior as if it were still open after implementation.
- `docs/goals/03-trace-divergence-overlay/README.md` or plan notes identify how the frontend should request matching samples.
- Top-level `README.md` is changed only if setup or command surfaces changed.

### Increment Completion Notes

- Keep stale placeholders out of the final record.
- Capture any Vite/frontend non-changes explicitly if Goal 03 depends on knowing the frontend was untouched.

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
