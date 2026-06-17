# Goal 03: Trace Divergence Overlay

## Objective

Overlay the browser `satellite.js` trace and the Python/Orekit trace, then visualize their divergence over the sampled time range.

## Branch Goal

Add an offline-tolerant comparison path between the existing browser `satellite.js` preview and the Goal 02 Orekit endpoint. The first overlay compares native `TEME` samples only, aligns by epoch, renders both traces, and shows compact text metrics for divergence.

## Why Third

The project becomes analytically useful once it can compare propagation sources rather than merely render one orbit.

## Acceptance Criteria

- The frontend can request Orekit samples for the same object and time range as the local `satellite.js` samples.
- Both traces are visible, visually distinct, and clearly associated with their propagation source.
- Divergence is computed from aligned sample epochs and displayed as distance over time or per-sample metadata.
- The UI can tolerate missing samples or API errors without breaking the scene.
- The comparison makes frame and unit assumptions visible in code and docs.

## Proposed Increments

1. Add a frontend API client for propagation samples.
2. Align sample epochs between `satellite.js` and Orekit outputs.
3. Render dual traces with source-aware materials.
4. Compute divergence metrics and expose a minimal readout.
5. Add tests or fixtures for sample alignment and distance calculations.

See [PLAN.md](PLAN.md) for approval-sized implementation increments.

## Design Notes

- Do not hide frame conversion questions behind visual styling; document what is actually being compared.
- Start with one object and one fixed time range, then generalize only after the comparison is trustworthy.
- Keep divergence computation independent from Three.js geometry creation.
- Use manual Orekit refresh first; do not fetch on every sampling-setting edit.
- Keep the local `satellite.js` trace visible when the API is offline or returns an error.
- Use a compact text readout for current, max, mean, aligned count, and unmatched counts; no chart in Goal 03.

## Dependencies

- Goal 01 browser-side samples.
- Goal 02 Orekit sample endpoint: `POST /propagate/tle`.

## Goal 02 Handoff Notes

- Request Orekit samples with explicit TLE lines, `start_epoch`, `duration_minutes`, `step_seconds`, and `frame: "native"`.
- Goal 02 returns native Orekit TLE samples in `TEME`, with positions in kilometers and velocities in kilometers per second.
- Live API propagation requires the Python service to run with `OREKIT_DATA_PATH` set.
- Goal 02 samples use inclusive cadence: `floor(duration_seconds / step_seconds) + 1`. For the Goal 01 defaults, Orekit returns 186 samples.
- Goal 01 browser sampling currently uses its own sample-count calculation. Align `satellite.js` and Orekit samples by epoch before computing divergence.
- Treat matching `TEME` labels as a required precondition for the first comparison; later frame transforms belong to Goal 04.
- Default API base URL is `http://127.0.0.1:8000`, with a Vite env override allowed if needed.
- Epoch alignment should use exact normalized ISO keys first, with at most a `1` millisecond tolerance fallback for serialization differences.

## Risks

- Comparing coordinates from mismatched frames may produce attractive but meaningless divergence.
- Request latency can make timeline scrubbing feel awkward if data fetching is coupled directly to animation.
- Goal 01 and Goal 02 sample counts differ for the default window, so array-index comparison is explicitly unsafe.

## Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `uv run pytest`
- Manual browser verification with API running locally.
