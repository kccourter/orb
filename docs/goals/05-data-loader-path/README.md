# Goal 05: Data Loader Path

Completed on 2026-06-20. See [RECORD.md](RECORD.md) for implementation notes,
validation, and deferred propagation work. See [RUNBOOK.md](RUNBOOK.md) to
re-verify status locally.

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

## Completed Increments

1. Define scenario schema and source-type taxonomy.
2. Add TLE text/file loading path.
3. Add OEM/CCSDS loading path through Orekit where possible.
4. Add hand-authored initial-state input path.
5. Add frontend scenario selection and validation feedback.
6. Add fixtures and regression tests for representative inputs.

See [PLAN.md](PLAN.md) for the approved implementation increments.

## Design Notes

- Keep raw source parsing on the Python side when Orekit provides robust support.
- Normalize early: the rest of the app should consume one scenario/propagation request shape.
- Preserve original source metadata for traceability and debugging.
- Treat `native` as a propagation request mode, not a scenario frame.
- Prefer bundled examples and backend normalization before adding broad browser file parsing.

## Schema Notes

- Normalized scenarios use source types `tle`, `oem_ccsds`, and `initial_state`.
- Scenario frames use exact Goal 04 identifiers: `TEME`, `EME2000`, `ITRF`, and `QSW`.
- Scenario frame origins are `geocentric` or `spacecraft`.
- The first scenario endpoints are `/scenarios/examples`, `/scenarios/examples/{id}`, and `/scenarios/normalize`.
- In Increment 2, those endpoints support the bundled ISS TLE example and submitted TLE text.
- In Increment 3, those endpoints also support a bundled CCSDS OEM example and submitted OEM text when Orekit data is available.
- In Increment 4, those endpoints also support a bundled hand-authored initial-state JSON example and submitted initial-state JSON.
- In Increment 5, the frontend lists bundled examples, loads selected scenarios through the API, updates the active TLE preview when TLE data is present, and displays normalized sample-only scenarios without browser-side parsing.

## Dependencies

- Goal 02 propagation models.
- Goal 03 frontend API client patterns.
- Goal 04 frame naming and transform policy.

## Goal 04 Handoff Notes

- Scenario frame metadata should use exact frame identifiers: `TEME`, `EME2000`, `ITRF`, or `QSW`.
- `native` is a propagation request compatibility mode, not a scenario source frame.
- Preserve frame origin metadata where it matters; QSW is spacecraft-centered, while TEME/EME2000/ITRF are geocentric in Goal 04.
- Avoid broad frame names such as `ECI` and `ECEF` unless the loader maps them to exact supported frames.

## Risks

- OEM/CCSDS support may require Orekit data and time-scale setup earlier than simpler TLE demos.
- A too-general schema can slow down the first useful loader.
- Browser file handling can complicate validation if parsing responsibilities are split.
- Arbitrary initial-state propagation may need a separate dynamics decision; Goal 05 can still normalize and display the source data.
- The first OEM subset requires a single segment with a supported exact frame such as `EME2000`.
- The first initial-state subset is display-ready only; propagation from arbitrary states remains a later dynamics decision.

## Validation

- `uv run pytest`
- `uv run ruff check .`
- Data-enabled pytest with `OREKIT_DATA_PATH` for OEM parsing.
- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `CI=true pnpm --dir apps/web smoke`
- Live scenario-load smoke test in the browser.
