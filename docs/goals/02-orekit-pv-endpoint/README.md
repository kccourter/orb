# Goal 02: Orekit PV Endpoint

## Objective

Add a Python endpoint that returns sampled Orekit position-velocity coordinates for the same time range used by the browser TLE trace.

## Why Second

This establishes the Python service as the authoritative propagation side and creates the API contract the visualization can consume.

## Acceptance Criteria

- A FastAPI endpoint accepts a TLE or named demo object, start epoch, duration, and step size.
- The endpoint returns sampled position and velocity vectors with epoch, frame, units, and source metadata.
- Orekit initialization is isolated behind a small adapter so JVM startup details do not leak into route handlers.
- Errors for invalid TLEs, unsupported frames, or unavailable Orekit data are explicit.
- The endpoint can be exercised from a local curl command or Python test.

## Proposed Increments

1. Define request and response models for propagation samples.
2. Add an Orekit bootstrap module with clear JVM and data-directory handling.
3. Implement TLE-to-samples propagation for the ISS test case.
4. Add route-level validation and focused tests.
5. Document local API usage and required Orekit data behavior.

## Design Notes

- Keep API units in kilometers and kilometers per second unless Orekit adapter internals need SI.
- Preserve frame names in responses rather than implying the frontend knows the frame.
- Avoid restarting the JVM in-process; Orekit/JPype should initialize once per API process.

## Dependencies

- Goal 01 sample timing conventions.
- `orekit-jpype[jdk4py]`.
- A policy for Orekit data files, even if the first increment uses bundled or minimal data.

## Risks

- Orekit data setup can become a hidden environment dependency.
- JPype JVM lifecycle can make tests flaky if initialization is not centralized.
- Frame mismatch against `satellite.js` can create false divergence.

## Validation

- `uv run ruff check .`
- `uv run pytest`
- Curl or HTTP client check against the local FastAPI endpoint.
