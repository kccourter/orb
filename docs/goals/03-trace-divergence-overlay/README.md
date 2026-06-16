# Goal 03: Trace Divergence Overlay

## Objective

Overlay the browser `satellite.js` trace and the Python/Orekit trace, then visualize their divergence over the sampled time range.

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

## Dependencies

- Goal 01 browser-side samples.
- Goal 02 Orekit sample endpoint.

## Risks

- Comparing coordinates from mismatched frames may produce attractive but meaningless divergence.
- Request latency can make timeline scrubbing feel awkward if data fetching is coupled directly to animation.

## Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `uv run pytest`
- Manual browser verification with API running locally.
