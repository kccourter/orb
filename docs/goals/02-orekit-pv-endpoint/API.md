# Goal 02 API

## Endpoint

`POST /propagate/tle`

Returns Orekit-sampled position and velocity vectors for a supplied two-line element set.

`GET /healthz` remains a lightweight process health check and does not initialize Orekit. `GET /propagate/demo` remains a circular-orbit placeholder for simple API wiring experiments.

## Runtime Setup

Orekit TLE propagation requires Orekit data for UTC/leap-second history. Set `OREKIT_DATA_PATH` to a local Orekit data zip or directory before calling the endpoint.

```sh
export UV_CACHE_DIR="$PWD/.uv-cache"
export OREKIT_DATA_PATH="$PWD/orekit-data.zip"
uv run orb-api
```

The local `orekit-data.zip` and `orekit-data/` paths are ignored by git.

## Request

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

`frame` currently accepts only `native`. For Orekit TLE propagation, the native frame returned for the ISS fixture is `TEME`.

Goal 04 plans to extend this field to exact frame identifiers such as `TEME`, `EME2000`, `ITRF`, and `QSW`; see [Goal 04 FRAMES.md](../04-frame-controls/FRAMES.md). Until that increment is implemented, those values are documentation-only and still fail request validation.

## Response

```json
{
  "source": {
    "type": "tle",
    "name": "ISS (ZARYA)",
    "propagator": "orekit-tle"
  },
  "frame": {
    "name": "TEME",
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
      "position_km": [-2705.1473197400983, 4717.883990144068, 4061.802497635731],
      "velocity_km_s": [-6.599744841940541, -0.4287525603479834, -3.876686900361648]
    }
  ]
}
```

Sampling is inclusive: `floor(duration_seconds / step_seconds) + 1`. The Goal 01 defaults produce 186 Orekit samples.

## Errors

`422`: schema or basic field validation failure, including unsupported `frame` values.

`400`: the JSON payload passed schema validation, but Orekit cannot propagate the TLE.

```json
{
  "error": {
    "code": "tle_propagation_failed",
    "message": "Invalid or unsupported TLE."
  }
}
```

`503`: Orekit runtime or required data is unavailable.

```json
{
  "error": {
    "code": "orekit_unavailable",
    "message": "OREKIT_DATA_PATH is required for Orekit TLE propagation."
  }
}
```

## Curl Smoke

Start the API with `OREKIT_DATA_PATH` set, then call:

```sh
curl -sS http://127.0.0.1:8000/propagate/tle \
  -H 'Content-Type: application/json' \
  --json '{"tle":{"name":"ISS (ZARYA)","line1":"1 25544U 98067A   24173.56347222  .00020137  00000+0  35155-3 0  9993","line2":"2 25544  51.6390 336.0970 0007833  50.2065  79.8843 15.50417852458913"},"sampling":{"start_epoch":"2024-06-21T13:31:24Z","duration_minutes":92.5,"step_seconds":30},"frame":"native"}'
```

Expected smoke result: HTTP `200`, frame `TEME`, sample count `186`, and first sample epoch `2024-06-21T13:31:24Z`.
