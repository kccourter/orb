# Goal 05: Data Loader Path

## Objective

Add a data-loader path for OEM/CCSDS files, TLEs, and hand-authored initial states.

## Why Fifth

Once the visualization and comparison loop works, the next leverage point is loading real and synthetic scenarios without hard-coding each experiment.

## Acceptance Criteria

- The project has a clear scenario input model for TLE, OEM/CCSDS, and hand-authored initial state cases.
- The API can validate and normalize loaded scenario data into a shared propagation request shape.
- The frontend can select or submit a scenario without knowing each source format’s parsing details.
- File and text input errors are actionable and tied to the source format.
- Example scenario files or fixtures are present for repeatable local testing.

## Proposed Increments

1. Define scenario schema and source-type taxonomy.
2. Add TLE text/file loading path.
3. Add OEM/CCSDS loading path through Orekit where possible.
4. Add hand-authored initial-state input path.
5. Add frontend scenario selection and validation feedback.
6. Add fixtures and regression tests for representative inputs.

## Design Notes

- Keep raw source parsing on the Python side when Orekit provides robust support.
- Normalize early: the rest of the app should consume one scenario/propagation request shape.
- Preserve original source metadata for traceability and debugging.

## Dependencies

- Goal 02 propagation models.
- Goal 03 frontend API client patterns.
- Goal 04 frame naming and transform policy.

## Risks

- OEM/CCSDS support may require Orekit data and time-scale setup earlier than simpler TLE demos.
- A too-general schema can slow down the first useful loader.
- Browser file handling can complicate validation if parsing responsibilities are split.

## Validation

- `uv run pytest`
- `pnpm --dir apps/web check`
- Fixture-based tests for TLE, OEM/CCSDS, and initial-state inputs.
- Manual scenario-load smoke test in the browser.
