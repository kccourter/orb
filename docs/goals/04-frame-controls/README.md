# Goal 04: Frame Controls

## Objective

Add frame controls for ECI, ECEF, and a local orbital frame so users can inspect the same trajectory from different coordinate perspectives.

## Status

Completed on 2026-06-17. See [RECORD.md](RECORD.md) for implementation notes, validation, and Goal 05 handoff details.

## Why Fourth

Frame switching turns the visualization from a pretty orbit viewer into a tool for reasoning about reference frames, ground-relative motion, and local motion.

## Acceptance Criteria

- The UI exposes a compact frame selector for ECI, ECEF, and local orbital frame views.
- The selected frame changes trace rendering and satellite marker placement consistently.
- Frame metadata is carried with samples and transformed in a clear, testable layer.
- The local orbital frame definition is documented in code and goal notes.
- The controls do not require recomputing data in the browser when the API can provide a cleaner source.

## Proposed Increments

1. Decide exact frame definitions and naming used in the API and frontend. Completed.
2. Add frame selection state to the web app. Completed.
3. Implement ECI/ECEF transform path or request strategy. Completed.
4. Implement a first local orbital frame view. Completed.
5. Add visual and numerical checks for transform correctness. Completed.

See [PLAN.md](PLAN.md) for approval-sized implementation increments.

## Design Notes

- Prefer Orekit for authoritative frame transforms.
- Keep UI state separate from propagation settings; switching frames should not silently change the propagated trajectory.
- Use exact frame identifiers in API payloads; avoid bare `ECI` unless it is mapped to a documented frame such as `EME2000`.
- Prefer `EME2000` for the first explicit inertial option, `ITRF` for the first Earth-fixed option, and a documented local orbital convention such as `QSW` for the first local option unless Increment 1 revises those names.
- Keep `native`/`TEME` compatibility explicit so Goal 03 comparison behavior remains understandable.

See [FRAMES.md](FRAMES.md) for the accepted Goal 04 frame vocabulary, UI labels, local QSW convention, and comparison policy.

## Dependencies

- Goal 02 frame-aware API responses.
- Goal 03 dual-trace rendering.

## Goal 03 Handoff Notes

- Goal 03 compares native `TEME` samples only; do not treat that as a generic ECI view without an explicit naming decision.
- Comparable frontend samples carry source, epoch, frame, position units, velocity units, position, and velocity metadata.
- Scene trace operations support named traces through `setTracePoints(traceId, points)` and `clearTrace(traceId)`.
- Current trace IDs are `satellite-js` and `orekit`.
- Alignment and divergence are epoch-based; frame controls should keep trace geometry, marker position, and divergence readout on the same selected-frame sample set.
- Frame transforms remain out of Goal 03 and should be documented before Goal 04 runtime changes.

## Risks

- ECI and TEME naming can be muddled if the first TLE path is not explicit.
- Local orbital frame conventions are easy to confuse without a strong naming policy.
- Transforming dense traces may introduce performance pressure if done every animation frame.

## Implemented Behavior

- API frame values are `native`, `TEME`, `EME2000`, `ITRF`, and `QSW`.
- The frontend defaults to `native` to preserve the Goal 03 comparison path.
- `native` and explicit `TEME` support local/Orekit dual-trace divergence.
- `EME2000`, `ITRF`, and `QSW` are Orekit display modes until a matching local transform exists.
- QSW is spacecraft-centered and is not treated as a normal geocentric trace.

## Validation

- `uv run pytest`
- `uv run ruff check .`
- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`
- Manual browser verification for each frame mode.
- Spot-check known positions or frame transforms against Orekit outputs.
