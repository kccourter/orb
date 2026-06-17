# Goal 02 Completion Record

## Status

Completed on 2026-06-17.

Goal 02 provides an Orekit-backed TLE propagation endpoint for sampled position-velocity output.

## Implemented Shape

- API contract models live in `src/orb_lab/models.py`.
- Orekit/JPype runtime bootstrap lives in `src/orb_lab/orekit_runtime.py`.
- TLE propagation logic lives in `src/orb_lab/propagation.py`.
- `POST /propagate/tle` is wired in `src/orb_lab/api.py`.
- Route tests live in `tests/test_api_propagation.py`.
- Runtime tests live in `tests/test_orekit_runtime.py`.
- Adapter tests live in `tests/test_tle_propagation.py`.

## Endpoint Contract

- Endpoint: `POST /propagate/tle`.
- Request source: explicit TLE lines with optional name.
- Sampling inputs: ISO UTC `start_epoch`, `duration_minutes`, and `step_seconds`.
- Frame request: `native` only for Goal 02.
- Response frame for the ISS fixture: `TEME`, from Orekit's native TLE propagator frame.
- Response units: kilometers and kilometers per second.
- Sampling cadence: inclusive, `floor(duration_seconds / step_seconds) + 1`.
- Goal 01 defaults produce 186 Orekit samples.

## Runtime And Data Policy

- `orekit-jpype` initializes through the bundled `jdk4py` Java runtime.
- Importing `orb_lab.api` does not start the JVM.
- `GET /healthz` remains independent from Orekit startup.
- Runtime initialization alone does not require Orekit data.
- TLE propagation does require Orekit data for UTC/leap-second history.
- Set `OREKIT_DATA_PATH` to a local `orekit-data.zip` or `orekit-data/` path before live propagation.
- Local Orekit data paths are ignored by git.

## HTTP Behavior

- `200`: successful propagation response.
- `400`: TLE/domain propagation failure after schema validation.
- `422`: FastAPI/Pydantic schema and field validation failure.
- `503`: Orekit runtime or required data unavailable.

`GET /propagate/demo` remains available as a circular-orbit placeholder and is separate from authoritative Orekit propagation.

## Validation

Ran on 2026-06-17:

- `uv run ruff check .` passed.
- `uv run pytest` passed: 23 passed, 1 skipped.
- `UV_CACHE_DIR=/Users/kcourter/dev/orb/.uv-cache OREKIT_DATA_PATH=/Users/kcourter/dev/orb/orekit-data.zip uv run pytest` passed: 24 passed.

Data-enabled FastAPI `TestClient` smoke returned:

- HTTP status `200`.
- Frame `TEME`.
- Sample count `186`.
- First sample epoch `2024-06-21T13:31:24Z`.

Data-enabled localhost smoke also passed with a real Uvicorn server and curl request:

- Server command used in the sandbox: `UV_CACHE_DIR=/Users/kcourter/dev/orb/.uv-cache OREKIT_DATA_PATH=/Users/kcourter/dev/orb/orekit-data.zip uv run uvicorn orb_lab.api:app --host 127.0.0.1 --port 8000`.
- `POST /propagate/tle` returned HTTP `200`.
- Response metadata included frame `TEME`, sample count `186`, and first sample epoch `2024-06-21T13:31:24Z`.
- `uv run orb-api` was not used for the smoke because its reload watcher is blocked by the sandbox; it remains the normal console script outside that constraint.

## Known Warnings And Risks

- JPype with Java 25 emits a native-access warning during JVM startup. Initialization and propagation still succeed.
- A data-enabled FastAPI `TestClient` smoke can linger after successful output when the JVM is started in the same process, so automated live Orekit coverage remains at the adapter test layer.
- Goal 02 does not add browser API calls or dual-trace rendering.
- Goal 03 must align samples by epoch, not array index. Goal 01 browser sampling currently produces a different sample count from the inclusive Orekit API cadence.
- Goal 04 still owns broader frame controls and any transforms beyond native TLE `TEME`.
