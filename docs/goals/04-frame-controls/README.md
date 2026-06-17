# Goal 04: Frame Controls

## Objective

Add frame controls for ECI, ECEF, and a local orbital frame so users can inspect the same trajectory from different coordinate perspectives.

## Why Fourth

Frame switching turns the visualization from a pretty orbit viewer into a tool for reasoning about reference frames, ground-relative motion, and local motion.

## Acceptance Criteria

- The UI exposes a compact frame selector for ECI, ECEF, and local orbital frame views.
- The selected frame changes trace rendering and satellite marker placement consistently.
- Frame metadata is carried with samples and transformed in a clear, testable layer.
- The local orbital frame definition is documented in code and goal notes.
- The controls do not require recomputing data in the browser when the API can provide a cleaner source.

## Proposed Increments

1. Decide exact frame definitions and naming used in the API and frontend.
2. Add frame selection state to the web app.
3. Implement ECI/ECEF transform path or request strategy.
4. Implement a first local orbital frame view.
5. Add visual and numerical checks for transform correctness.

See [PLAN.md](PLAN.md) for approval-sized implementation increments.

## Design Notes

- Prefer Orekit for authoritative frame transforms.
- Keep UI state separate from propagation settings; switching frames should not silently change the propagated trajectory.
- Local orbital frame options may need a named convention such as QSW, TNW, or LVLH before implementation.

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

## Validation

- `uv run pytest`
- `pnpm --dir apps/web check`
- Manual browser verification for each frame mode.
- Spot-check known positions or frame transforms against Orekit outputs.
