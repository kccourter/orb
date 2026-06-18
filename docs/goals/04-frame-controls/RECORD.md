# Goal 04 Completion Record

## Status

Completed on 2026-06-17.

Goal 04 adds documented frame vocabulary, backend frame-aware TLE propagation, frontend frame selection, and selected-frame rendering behavior.

## Implemented Shape

- Frame policy lives in `docs/goals/04-frame-controls/FRAMES.md`.
- Backend frame request types and response metadata live in `src/orb_lab/models.py`.
- Orekit frame resolution and PV transforms live in `src/orb_lab/frames.py`.
- TLE propagation frame routing lives in `src/orb_lab/propagation.py`.
- Frontend frame state lives in `apps/web/src/state/frameSettings.ts`.
- Frontend frame selector UI lives in `apps/web/src/ui/frameControls.ts`.
- App-level selected-frame rendering orchestration lives in `apps/web/src/main.ts`.
- Frame-state fixture checks live in `apps/web/src/state/frameSettings.fixtures.ts`.
- Browser smoke coverage lives in `apps/web/tests/orbit-scene.smoke.spec.ts`.

## Supported Frames

- `native`: compatibility request; returns Orekit TLE native frame, `TEME` for the ISS fixture.
- `TEME`: explicit TLE comparison frame.
- `EME2000`: explicit inertial display frame, labeled `ECI (EME2000)` in the UI.
- `ITRF`: explicit Earth-fixed display frame, labeled `ECEF (ITRF)` in the UI.
- `QSW`: spacecraft-centered local orbital display frame.

The API rejects broad frame names such as `ECI` and `ECEF`; callers must use exact frame identifiers.

## Rendering And Metrics Policy

- `native` and explicit `TEME` preserve the Goal 03 local/Orekit comparison path.
- `EME2000`, `ITRF`, and `QSW` render as Orekit display modes.
- In Orekit display mode, the local `TEME` trace is cleared, the Orekit trace is displayed, and marker animation follows Orekit samples.
- Divergence metrics are shown only when both compared sample sets have matching frame labels and compatible units.
- Non-comparable display frames keep the metrics readout frame-labeled but unavailable.
- QSW is spacecraft-centered; it is not rendered as a geocentric comparison trace.

## Validation

Ran on 2026-06-17:

- `uv run pytest` passed: 29 passed, 5 skipped.
- `uv run ruff check .` passed.
- `UV_CACHE_DIR=/Users/kcourter/dev/orb/.uv-cache OREKIT_DATA_PATH=/Users/kcourter/dev/orb/orekit-data.zip uv run pytest` passed: 34 passed.
- `CI=true pnpm --dir apps/web check` passed.
- `CI=true pnpm --dir apps/web build` passed.
- `CI=true pnpm --dir apps/web smoke` passed: 4 tests.

The frontend production build still reports the known Vite warnings for `satellite.js` browser externalization and large chunks. Those warnings did not block the build.

Data-enabled backend checks cover metadata and numerical invariants for `native`, `TEME`, `EME2000`, `ITRF`, and `QSW`. Frontend smoke coverage uses mocked Orekit responses to verify frame selector defaults, selected-frame request wiring, stale-state clearing, Orekit display mode, and nonblank canvas rendering.

## Goal 05 Handoff

- Scenario data should use exact frame identifiers: `TEME`, `EME2000`, `ITRF`, or `QSW`.
- `native` is a propagation request compatibility mode, not a scenario source frame.
- Scenario metadata should carry frame, origin, units, source type, and any raw-source traceability.
- The frontend can render Orekit display frames even when local `satellite.js` comparison is unavailable.
- Scenario loaders should not emit broad frame categories such as `ECI` or `ECEF` without mapping them to exact frame identifiers.

## Known Risks

- Browser-side `satellite.js` samples remain `TEME`; no browser transform path exists for `EME2000`, `ITRF`, or `QSW`.
- QSW display has no axes overlay in Goal 04.
- Earth rotation is not paused in `ITRF` display.
- Live transformed-frame propagation depends on `OREKIT_DATA_PATH`.
