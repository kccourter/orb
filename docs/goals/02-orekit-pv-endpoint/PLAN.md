# Orekit PV Endpoint Increment Plan

## Goal

Add a Python API path that returns sampled Orekit position-velocity coordinates for the same object and time range used by the browser visualization.

Each increment should be approved before implementation. The increments are ordered to keep API shape, Orekit lifecycle, propagation behavior, and frontend integration boundaries separate.

## Increment 1: API Contract and Models

### Objective

Define the request and response contract without invoking Orekit.

### Scope

- Add Pydantic models for propagation requests, TLE input, sampling window, frame name, and sampled state vectors.
- Decide canonical API units: kilometers for position, kilometers per second for velocity, ISO 8601 UTC strings for epochs.
- Add a placeholder route shape that can return a clear `501` or deterministic fixture until Orekit propagation lands.
- Keep the existing demo endpoint intact unless it is explicitly replaced later.

### Expected Files

- `src/orb_lab/api.py`
- Possible new module: `src/orb_lab/models.py`
- Possible tests: `tests/test_api_models.py`

### Acceptance Criteria

- Request and response JSON shapes are stable enough for frontend work.
- Invalid duration, step size, malformed epoch, and malformed TLE payloads fail with useful validation errors.
- The route naming is chosen and documented, for example `POST /propagate/tle`.

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
- Define how `orekit-data/` is discovered, required, or skipped for the first TLE-only increment.
- Return explicit startup/configuration errors that the API can translate into HTTP responses.

### Expected Files

- New module: `src/orb_lab/orekit_runtime.py`
- Possible test: `tests/test_orekit_runtime.py`
- Documentation update in this goal folder if Orekit data policy is decided.

### Acceptance Criteria

- Repeated calls to the bootstrap function are idempotent.
- JVM lifecycle details are isolated from FastAPI routes.
- Missing Orekit data behavior is explicit and testable.

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

### Expected Files

- New module: `src/orb_lab/propagation.py`
- Possible updates: `src/orb_lab/api.py`, `src/orb_lab/models.py`
- Tests: `tests/test_tle_propagation.py`

### Acceptance Criteria

- A known ISS TLE returns a non-empty sequence of state vectors.
- The number of samples matches the requested duration and step size.
- Position and velocity values are finite and unit-converted.
- The adapter does not start or restart the JVM directly.

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

### Expected Files

- `src/orb_lab/api.py`
- `tests/test_api_propagation.py`
- Possible documentation update: `docs/goals/02-orekit-pv-endpoint/README.md`

### Acceptance Criteria

- Valid TLE propagation works through HTTP.
- Invalid TLEs return a useful `422` or `400`.
- Runtime configuration failures return a clear `503`.
- Response payload includes enough metadata for the frontend to compare with `satellite.js`.

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

### Expected Files

- `docs/goals/02-orekit-pv-endpoint/README.md`
- Possible new file: `docs/goals/02-orekit-pv-endpoint/API.md`
- Possible update: `docs/goals/03-trace-divergence-overlay/README.md`
- Possible update: `README.md`

### Acceptance Criteria

- A developer can start the API and run one documented request locally.
- Goal 03 has a clear input contract for overlay work.
- Stale placeholder language is removed from touched docs.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- Manual documented curl command.

### Approval Question

Approve documentation and handoff notes before considering the goal complete.

## Open Decisions

- Endpoint name: prefer `POST /propagate/tle` unless we want a broader `POST /propagate` with `source.type`.
- Frame naming: decide whether the first Orekit response should be `TEME`, `EME2000`, or another explicit frame.
- Orekit data policy: decide whether `orekit-data/` is required from the beginning or deferred until non-TLE frame/time-scale features need it.
- Test strategy: decide how much JVM-backed testing should run by default versus behind a marker.
- Error taxonomy: decide whether to introduce project-specific exception types before or during route integration.

## Not In Scope

- Browser overlay work.
- Frame controls.
- OEM/CCSDS loading.
- Non-TLE propagation models.
- Maneuvers, force-model configuration, or event detection.
