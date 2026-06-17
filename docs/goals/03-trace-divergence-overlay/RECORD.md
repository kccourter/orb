# Goal 03 Completion Record

## Status

Completed on 2026-06-17.

Goal 03 adds an offline-tolerant browser comparison path between local `satellite.js` TLE preview samples and the Goal 02 Orekit propagation endpoint.

## Implemented Shape

- Frontend API client lives in `apps/web/src/api/propagation.ts`.
- API base URL config lives in `apps/web/src/config.ts`.
- Common comparable sample adapters live in `apps/web/src/orbits/sampleTypes.ts`.
- Epoch alignment lives in `apps/web/src/orbits/alignment.ts`.
- Divergence math and formatting live in `apps/web/src/orbits/divergence.ts`.
- Fixture checks live in `apps/web/src/orbits/alignment.fixtures.ts`, `apps/web/src/orbits/divergence.fixtures.ts`, and are imported through `apps/web/src/orbits/fixtureChecks.ts`.
- Dual-trace scene support lives in `apps/web/src/scene/createScene.ts` and `apps/web/src/scene/orbitTrace.ts`.
- Orekit overlay controls and divergence readout live in `apps/web/src/ui/orekitOverlayControls.ts`.
- App orchestration lives in `apps/web/src/main.ts`.
- Playwright smoke coverage lives in `apps/web/tests/orbit-scene.smoke.spec.ts`.

## User-Facing Behavior

- The local `satellite.js` trace renders immediately and remains usable if the API is offline.
- The Orekit trace is fetched only through the manual refresh control.
- API failures, frame mismatches, and unit mismatches are nonfatal and preserve the local scene.
- The overlay legend labels the yellow local trace and cyan Orekit trace.
- The divergence readout shows frame, current distance, max distance, mean distance, aligned count, and unmatched local/Orekit counts.
- Settings changes clear stale Orekit samples, the Orekit trace, and divergence metrics until the user refreshes Orekit again.

## API Contract Used

- Endpoint: `POST /propagate/tle`.
- Request frame: `native`.
- Default frontend API base URL: `http://127.0.0.1:8000`.
- Override: `VITE_ORB_API_BASE_URL`.
- The API allows local browser development origins matching `http://localhost:<port>` or `http://127.0.0.1:<port>` so Vite can complete the CORS preflight before posting propagation requests.
- Request source: bundled ISS TLE lines and the current normalized sampling settings.
- Response source expected by Goal 03: Orekit TLE samples with frame metadata and position/velocity units.

## Comparison Policy

- Goal 03 compares native `TEME` samples only.
- Positions are kilometers and velocities are kilometers per second.
- Samples are aligned by normalized ISO epoch, not array index.
- Exact epoch matches are preferred.
- A `1` millisecond fallback tolerance handles serialization differences only.
- Unmatched local and Orekit samples are reported in metadata and the readout.
- No interpolation, time stretching, or frame transform is performed in Goal 03.

## Fixture Coverage

- Alignment fixtures cover exact matches, extra remote samples, one millisecond tolerance matches, larger timestamp differences, frame mismatches, and unit mismatches.
- Divergence fixtures cover Euclidean distance calculation, max/mean/current summaries, nearest-current lookup, empty series handling, and display formatting.
- The existing Playwright smoke test intercepts the Orekit endpoint, verifies request shape, confirms the overlay status/readout, and checks the canvas is nonblank after refresh.
- No Vitest runner was introduced; fixtures execute through the normal frontend module graph.

## Validation

Ran on 2026-06-17:

- `CI=true pnpm --dir apps/web check` passed.
- `CI=true pnpm --dir apps/web build` passed.
- `CI=true pnpm --dir apps/web smoke` passed: 3 tests.
- `uv run pytest` passed: 23 passed, 1 skipped.

The production frontend build still reports the existing Vite warnings for `satellite.js` browser externalization and large chunks. Those warnings did not block the build.

The Playwright smoke path covers desktop-like Chromium rendering with a mocked Orekit endpoint. Live browser verification with a running FastAPI/Orekit service should use:

- API: `UV_CACHE_DIR=/Users/kcourter/dev/orb/.uv-cache OREKIT_DATA_PATH=/Users/kcourter/dev/orb/orekit-data.zip uv run uvicorn orb_lab.api:app --host 127.0.0.1 --port 8000`
- Web: `pnpm --dir apps/web dev`

## Goal 04 Handoff

- Goal 04 owns ECI, ECEF, and local orbital frame definitions and transforms.
- Goal 03 scene APIs already support named traces with `setTracePoints(traceId, points)` and `clearTrace(traceId)`.
- Current trace IDs are `satellite-js` and `orekit`.
- `ComparableOrbitSample` carries `source`, `epochIso`, `frame`, position units, velocity units, position, and velocity.
- `SampleAlignment` records aligned pairs plus local-only and remote-only samples.
- `DivergenceSeries` records per-epoch distances and unmatched counts.
- Goal 04 should keep trace geometry, marker position, and divergence readout on the same selected-frame sample set.
- Goal 04 should not treat Goal 03's `TEME` comparison as a generic ECI comparison without a documented frame naming decision.

## Known Risks

- Native TLE `TEME` comparison is explicit but limited; broader frame support is still pending.
- The animated marker remains local-only in Goal 03.
- The Orekit trace uses aligned remote samples only, so unmatched Orekit samples are intentionally not rendered in the comparison trace.
- Live Orekit browser verification depends on `OREKIT_DATA_PATH` and the local API service being started separately.
