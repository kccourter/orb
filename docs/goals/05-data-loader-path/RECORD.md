# Goal 05 Completion Record

## Status

Completed on 2026-06-20.

Goal 05 adds a normalized scenario-loading path for bundled and submitted TLE,
CCSDS OEM, and hand-authored initial-state sources. The frontend can load the
bundled examples without duplicating backend parsing logic.

## Implemented Shape

- Scenario Pydantic models live in `src/orb_lab/models.py`.
- Scenario normalization and example loading live in `src/orb_lab/scenarios.py`.
- Scenario API routes live in `src/orb_lab/api.py`.
- Bundled examples live in `examples/scenarios/`.
- Backend regression coverage lives in `tests/test_scenarios_models.py`,
  `tests/test_scenarios_tle.py`, `tests/test_scenarios_oem.py`, and
  `tests/test_scenarios_initial_state.py`.
- Frontend API types and client helpers live in `apps/web/src/api/scenarios.ts`.
- Frontend active scenario state lives in `apps/web/src/state/scenarioState.ts`.
- Frontend example-selection controls live in
  `apps/web/src/ui/scenarioControls.ts`.
- Frontend scenario loading and display orchestration live in
  `apps/web/src/main.ts`.
- Browser smoke coverage lives in `apps/web/tests/orbit-scene.smoke.spec.ts`.

## API And Examples

- `GET /scenarios/examples` lists bundled examples.
- `GET /scenarios/examples/{id}` returns a normalized bundled example.
- `POST /scenarios/normalize` normalizes submitted source text.

Bundled examples:

- `iss-tle`: ISS TLE text, frame `TEME`.
- `iss-oem`: ISS CCSDS OEM sample, frame `EME2000`.
- `manual-initial-state`: hand-authored JSON state, frame `EME2000`.

## Source Behavior

- TLE scenarios preserve raw text, object id, and validated TLE lines. They
  normalize to frame `TEME`, origin `geocentric`, km and km/s units, and can be
  converted into the existing TLE propagation request shape.
- OEM/CCSDS scenarios are parsed through Orekit when `OREKIT_DATA_PATH` is
  available. The first subset accepts exactly one segment, maps supported exact
  frames such as `EME2000`, preserves raw text and object metadata, and
  normalizes ephemeris coordinates to km and km/s samples. OEM scenarios are
  display-ready in Goal 05.
- Initial-state scenarios accept timezone-aware JSON with exact Goal 04 frame
  names, origin metadata, and position/velocity vectors in km/km/s or m/m/s.
  They normalize to one display-ready initial state plus a single sample.
  Arbitrary-state propagation remains deferred.

## Frame And Units

- Scenario frames use exact Goal 04 identifiers: `TEME`, `EME2000`, `ITRF`,
  and `QSW`.
- `native` remains a propagation request compatibility mode and is not accepted
  as a scenario source frame.
- Broad labels such as `ECI` and `ECEF` fail validation unless a loader maps
  them to an exact supported frame.
- Normalized scenario positions are km and velocities are km/s.
- Frame origins are `geocentric` or `spacecraft`.

## Frontend Workflow

- The web app fetches bundled examples from the API and presents them in a
  compact selector.
- Loading a TLE scenario updates the active browser-side TLE preview and the
  Orekit refresh input.
- Loading an OEM or initial-state scenario displays normalized sample data and
  leaves Orekit refresh in a no-TLE state until a later propagation path exists.
- Scenario load failures are shown in the scenario control area and preserve the
  current scene.
- Paste and file import UI are deferred; submitted text normalization exists at
  the API boundary.

## Validation

Ran on 2026-06-20:

- `uv run pytest` passed: 67 passed, 11 skipped.
- `uv run ruff check .` passed.
- `UV_CACHE_DIR=/Users/kcourter/dev/orb/.uv-cache OREKIT_DATA_PATH=/Users/kcourter/dev/orb/orekit-data.zip uv run pytest` passed: 78 passed.
- `pnpm --dir apps/web check` passed.
- `pnpm --dir apps/web build` passed.
- `CI=true pnpm --dir apps/web smoke` passed: 6 passed.
- Live scenario-load smoke passed against `http://127.0.0.1:8000` and
  `http://127.0.0.1:5173/` with desktop and narrow Playwright viewports.

The frontend production build still reports the known Vite browser-external
warnings from `satellite.js` and a chunk-size warning. Those warnings did not
block the build.

## Known Risks And Deferred Work

- OEM parsing requires local Orekit data; scenario routes map missing data to a
  service-unavailable response.
- OEM support is intentionally a narrow first subset, not complete CCSDS
  coverage.
- OEM and initial-state examples are display-ready, not independently
  propagatable in Goal 05.
- Browser paste and file input controls are deferred to keep the first UI pass
  compact.
- Future dynamics work should decide how arbitrary initial states become
  authoritative propagation requests.
