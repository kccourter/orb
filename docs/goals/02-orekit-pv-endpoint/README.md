# Goal 02: Orekit PV Endpoint

## Objective

Add a Python endpoint that returns sampled Orekit position-velocity coordinates for the same time range used by the browser TLE trace.

## Status

Completed on 2026-06-17. See [API.md](API.md) for endpoint usage and [RECORD.md](RECORD.md) for implementation notes and validation.

## Branch Goal

Build the first authoritative TLE propagation service path without changing the Goal 01 browser rendering flow. The target endpoint is `POST /propagate/tle`, using explicit TLE lines, an ISO UTC start epoch, duration, and step size, with responses that preserve frame and unit metadata for later overlay work.

## Why Second

This establishes the Python service as the authoritative propagation side and creates the API contract the visualization can consume.

## Acceptance Criteria

- A FastAPI endpoint accepts a TLE or named demo object, start epoch, duration, and step size.
- The endpoint returns sampled position and velocity vectors with epoch, frame, units, and source metadata.
- Orekit initialization is isolated behind a small adapter so JVM startup details do not leak into route handlers.
- Errors for invalid TLEs, unsupported frames, or unavailable Orekit data are explicit.
- The endpoint can be exercised from a local curl command or Python test.

## Completed Increments

1. Define request and response models for propagation samples.
2. Add an Orekit bootstrap module with clear JVM and data-directory handling.
3. Implement TLE-to-samples propagation for the ISS test case.
4. Add route-level validation and focused tests.
5. Document local API usage, runtime/data behavior, and Goal 03 handoff notes.

See [PLAN.md](PLAN.md) for approval-sized implementation increments.

## Design Notes

- Keep API units in kilometers and kilometers per second unless Orekit adapter internals need SI.
- Preserve frame names in responses rather than implying the frontend knows the frame.
- Orekit's native TLE propagator frame label for the ISS fixture is `TEME`; do not relabel it as generic `ECI`.
- Avoid restarting the JVM in-process; Orekit/JPype should initialize once per API process.
- Keep `GET /healthz` lightweight and independent from Orekit startup.
- `GET /propagate/demo` remains available as a placeholder demo route, separate from the Orekit endpoint.

## Dependencies

- Goal 01 sample timing conventions.
- Goal 01 ISS TLE fixture and defaults: epoch `2024-06-21T13:31:24Z`, duration `92.5` minutes, step `30` seconds.
- `orekit-jpype[jdk4py]`.
- Local Orekit data through `OREKIT_DATA_PATH` for live TLE propagation.

## Risks

- Orekit data setup is an explicit environment dependency for live propagation.
- JPype JVM lifecycle can make tests flaky if initialization is not centralized.
- Frame mismatch against `satellite.js` can create false divergence if later goals compare samples without checking frame metadata.

## Validation

- `uv run ruff check .`
- `uv run pytest`
- `UV_CACHE_DIR=/Users/kcourter/dev/orb/.uv-cache OREKIT_DATA_PATH=/Users/kcourter/dev/orb/orekit-data.zip uv run pytest`
- Data-enabled HTTP client smoke against `POST /propagate/tle`.
