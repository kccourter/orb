# Data Loader Path Increment Plan

## Goal

Support repeatable scenario loading for TLE, OEM/CCSDS, and hand-authored initial states through a normalized API and frontend workflow.

Each increment should be approved before implementation. This goal should make experiments easy to swap without hard-coding source data into the scene.

## Branch Goal

Add a small but durable scenario-loading layer that can normalize common orbit data sources into a shared API shape, preserve source metadata for traceability, and let the frontend load an example or submitted scenario without knowing each file format's parsing rules.

## Starting Context

- Goal 02 exposes `POST /propagate/tle` for explicit TLE propagation.
- Goal 03 added the frontend API client and manual Orekit refresh pattern.
- Goal 04 added exact frame values: `TEME`, `EME2000`, `ITRF`, and `QSW`; `native` remains a propagation request compatibility mode.
- The current app still uses a bundled ISS TLE fixture in the frontend.
- The frontend can already display transformed Orekit frames even when local `satellite.js` comparison is unavailable.

## Proposed Scenario Policy

- Scenario source types: `tle`, `oem_ccsds`, and `initial_state`.
- Scenario frame metadata must use exact frame identifiers, not broad `ECI` or `ECEF`.
- `native` is not a scenario source frame; it is only a request mode for propagation.
- Raw source text or source references should be preserved where practical.
- Python owns robust parsing and normalization. The browser may do lightweight UI validation but should not duplicate format parsers.
- The first implementation should prefer examples and text submission over persistent storage.

## Draft Normalized Scenario Shape

```ts
type ScenarioSourceType = "tle" | "oem_ccsds" | "initial_state";
type ScenarioFrame = "TEME" | "EME2000" | "ITRF" | "QSW";

type NormalizedScenario = {
  id?: string;
  name: string;
  source: {
    type: ScenarioSourceType;
    format: string;
    objectId?: string;
    raw?: string;
  };
  frame: {
    name: ScenarioFrame;
    origin: "geocentric" | "spacecraft";
  };
  units: {
    position: "km";
    velocity: "km/s";
  };
  epoch?: string;
  tle?: {
    line1: string;
    line2: string;
  };
  initialState?: {
    epoch: string;
    positionKm: [number, number, number];
    velocityKmS: [number, number, number];
  };
  samples?: Array<{
    epoch: string;
    positionKm: [number, number, number];
    velocityKmS: [number, number, number];
  }>;
};
```

The exact field names can change during Increment 1, but the model should keep the same concepts: source type, exact frame, origin, units, epoch, source traceability, and one normalized data payload.

## API Shape Candidates

Prefer small scenario endpoints rather than overloading `POST /propagate/tle`:

- `GET /scenarios/examples`: list bundled example scenarios.
- `GET /scenarios/examples/{id}`: return a normalized bundled example.
- `POST /scenarios/normalize`: accept source type plus text/JSON payload and return a normalized scenario.

Propagation from normalized scenarios can come later in the goal or use existing TLE propagation where the scenario type is `tle`.

## UX Defaults

- Add compact scenario controls near existing sampling/frame controls.
- Include an example selector first; free-form text/file input can follow.
- Loading a scenario should update the active source and leave frame/sampling controls understandable.
- Validation errors should appear in the scenario control area and preserve the current scene.
- Do not add persistent scenario storage in Goal 05.

## Validation And Test Strategy

- Keep parser/normalizer tests pure where possible.
- Use Orekit data-enabled tests for OEM only when required and skip cleanly without `OREKIT_DATA_PATH`.
- Add fixtures under `tests/fixtures/scenarios/` and examples under `examples/scenarios/` if useful.
- Continue running `uv run pytest`, `uv run ruff check .`, `CI=true pnpm --dir apps/web check`, `CI=true pnpm --dir apps/web build`, and `CI=true pnpm --dir apps/web smoke` as relevant.

## Increment Dependency Map

1. Increment 1 locks the normalized scenario schema and endpoint taxonomy.
2. Increment 2 implements TLE scenario loading and examples.
3. Increment 3 implements the first OEM/CCSDS loading path.
4. Increment 4 implements hand-authored initial-state scenarios.
5. Increment 5 adds frontend scenario selection and validation feedback.
6. Increment 6 finalizes fixtures, regression coverage, docs, and handoff.

## Increment 1: Scenario Schema and Source Taxonomy

### Objective

Define the normalized scenario model shared by API routes, parsers, fixtures, and frontend selection.

### Scope

- Define source types: `tle`, `oem_ccsds`, and `initial_state`.
- Decide required metadata: name, object id, epoch, exact source frame, origin, units, and propagation intent.
- Add Pydantic models for normalized scenarios if useful before source-specific parsing.
- Decide whether frontend TypeScript mirrors are added now or deferred to Increment 5.
- Decide endpoint taxonomy and example fixture locations.

### Expected Files

- `src/orb_lab/models.py`
- Possible module: `src/orb_lab/scenarios.py`
- Possible tests: `tests/test_scenarios_models.py`
- Possible docs update: `docs/goals/05-data-loader-path/README.md`

### Acceptance Criteria

- A single normalized scenario shape can represent all three source families.
- Invalid source type, unsupported frame, invalid origin, and missing metadata errors are explicit.
- The schema uses Goal 04 exact frame names.
- The model does not require full OEM parsing to be useful.

### Implementation Plan

1. Add scenario model types.
   - Define source type enum.
   - Define exact scenario frame enum.
   - Reuse or mirror frame origin concepts from Goal 04.
   - Define source metadata, units, TLE payload, initial-state payload, and optional sampled data.

2. Decide endpoint shape.
   - Document whether scenarios use `/scenarios/normalize` and `/scenarios/examples`.
   - Keep propagation endpoints separate unless a source-specific loader naturally maps to existing propagation.

3. Add schema tests.
   - Accepted minimal TLE scenario.
   - Accepted initial-state scenario.
   - Rejected `ECI`/`ECEF` broad frame names.
   - Rejected `native` as a scenario source frame.
   - Rejected missing source metadata.

4. Update docs.
   - Capture the schema decision and endpoint plan in Goal 05 README or plan notes.

### Edge Cases

- TLE scenarios naturally originate in `TEME`, while OEM scenarios may declare `EME2000` or another supported frame.
- QSW is spacecraft-centered and may be inappropriate as a source frame for most files.
- A scenario may have ephemeris samples instead of a single initial state.
- Units may arrive in meters from source formats but should normalize to kilometers.

### Increment Completion Notes

- This increment should not require frontend UI.
- Keep model names generic enough for later source formats, but do not build a general mission database.
- Implemented during Increment 1: added normalized scenario Pydantic models for source metadata, exact frame metadata, units, TLE payloads, state vectors, optional samples, and shared scenario validation.
- Scenario frames intentionally exclude `native`; broad labels such as `ECI` and `ECEF` fail validation until a loader maps them to exact Goal 04 frame names.
- Endpoint taxonomy remains planned as `/scenarios/examples`, `/scenarios/examples/{id}`, and `/scenarios/normalize`; no routes were added in this increment.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- `CI=true pnpm --dir apps/web check` only if frontend types are added.
- Verified during Increment 1 with `uv run pytest` and `uv run ruff check .`.

### Approval Question

Approve the scenario schema before adding source-specific loaders.

## Increment 2: TLE Loader and Example Scenario

### Objective

Load TLE scenarios from pasted text, structured JSON, or bundled examples.

### Scope

- Add a TLE parser/validator that normalizes into the scenario schema.
- Preserve raw TLE lines and optional name metadata.
- Add one ISS example scenario.
- Add an API path to normalize TLE text or return the example.
- Wire loaded TLE scenarios to existing propagation request construction where practical.

### Expected Files

- `src/orb_lab/scenarios.py`
- Possible route update: `src/orb_lab/api.py`
- Example: `examples/scenarios/iss.tle`
- Tests: `tests/test_scenarios_tle.py`
- Possible docs update: `docs/goals/05-data-loader-path/README.md`

### Acceptance Criteria

- Valid two-line and optional-name TLE inputs load successfully.
- Invalid line counts and malformed line prefixes return useful errors.
- Loaded TLE scenarios preserve raw TLE lines.
- A loaded TLE scenario can be propagated through the existing TLE endpoint inputs.
- The ISS example is available through the chosen example path.

### Implementation Plan

1. Add parser helpers.
   - Accept optional name plus two TLE lines.
   - Support common three-line text form: name, line 1, line 2.
   - Strip blank lines safely.

2. Normalize to scenario.
   - Set source type `tle`.
   - Set frame `TEME`, origin `geocentric`, units km/km/s.
   - Preserve raw text and TLE lines.

3. Add routes or service API.
   - Add the selected normalize/example endpoint from Increment 1.
   - Keep FastAPI handlers thin.

4. Add tests.
   - Valid two-line TLE.
   - Valid name plus two-line TLE.
   - Invalid line count.
   - Invalid line prefix.
   - Example scenario loads.

### Edge Cases

- TLE names may be absent.
- Extra whitespace and blank lines should not break valid input.
- Checksum validation can be deferred if line prefix and Orekit validation are already reliable enough for this increment.

### Increment Completion Notes

- TLE is the first useful end-to-end loader path.
- OEM and initial-state paths may still be unimplemented after this increment.
- Implemented during Increment 2: added TLE text normalization, bundled `iss-tle` example loading, `/scenarios/examples`, `/scenarios/examples/{id}`, and `/scenarios/normalize` routes, plus propagation-input extraction for normalized TLE scenarios.
- TLE scenarios normalize to frame `TEME`, origin `geocentric`, km/km/s units, preserved raw TLE text, object id metadata, and existing propagation-compatible TLE lines.
- OEM/CCSDS and hand-authored initial-state loaders remain unimplemented until later increments.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- Manual API request using the example TLE.
- Verified during Increment 2 with `uv run pytest` and `uv run ruff check .`; route tests cover listing the example, loading the example, normalizing submitted TLE text, and invalid TLE errors.

### Approval Question

Approve TLE loader behavior before adding OEM/CCSDS.

## Increment 3: OEM/CCSDS Loader

### Objective

Load CCSDS OEM data through Orekit where practical and normalize it for visualization.

### Scope

- Add OEM file/text ingestion path.
- Use Orekit parsing support if available in the current JPype wrapper.
- Normalize ephemeris segments into sample data and metadata.
- Add a small fixture with permissive licensing or hand-authored minimal content.
- Preserve time scale, object id, frame, and interpolation metadata where available.

### Expected Files

- `src/orb_lab/scenarios.py`
- Possible module: `src/orb_lab/ccsds.py`
- Fixture under `tests/fixtures/scenarios/` or `examples/scenarios/`
- Tests: `tests/test_scenarios_oem.py`

### Acceptance Criteria

- A representative OEM fixture loads into normalized scenario data.
- Parser errors identify the format issue clearly.
- Time scale and exact frame metadata survive normalization.
- Unsupported OEM frames fail with actionable errors or documented mapping rules.

### Implementation Plan

1. Inspect Orekit CCSDS parser support.
   - Confirm JPype import paths.
   - Decide required data context and Orekit data requirements.

2. Add OEM parser adapter.
   - Keep Orekit imports isolated.
   - Return normalized scenario samples in km/km/s.
   - Map OEM frame names to Goal 04 exact frames only when unambiguous.

3. Add fixture.
   - Prefer a tiny hand-authored OEM fixture with stable values.
   - Keep licensing and provenance clear.

4. Add tests.
   - Valid OEM fixture.
   - Unsupported frame.
   - Invalid syntax.
   - Data-unavailable behavior if Orekit data is required.

### Edge Cases

- OEM may contain multiple segments.
- OEM units or frames may be implicit or vary by standard version.
- Orekit parser APIs may require data context and time scales.
- A full OEM ephemeris may not need propagation, only display.

### Increment Completion Notes

- If Orekit wrapper support is awkward, document a narrower first OEM subset instead of forcing broad CCSDS support.
- Keep OEM parsing backend-only.
- Implemented during Increment 3: added CCSDS OEM text normalization through Orekit, bundled `iss-oem` example loading, route support for OEM examples and submitted OEM text, and data-enabled parser/route tests.
- The first OEM subset accepts exactly one segment, maps supported exact frames such as `EME2000`, preserves raw OEM text/object metadata, and normalizes samples to km and km/s.
- OEM parsing requires `OREKIT_DATA_PATH`; missing data maps to `503` through the scenario routes.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- Data-enabled pytest if required.
- Manual load of the example OEM file.
- Verified during Increment 3 with `uv run pytest` (`55 passed`, `11 skipped`), `uv run ruff check .`, and `UV_CACHE_DIR=/Users/kcourter/dev/orb/.uv-cache OREKIT_DATA_PATH=/Users/kcourter/dev/orb/orekit-data.zip uv run pytest` (`66 passed`).

### Approval Question

Approve OEM handling before adding hand-authored state input.

## Increment 4: Hand-Authored Initial State Loader

### Objective

Allow users to define a scenario from explicit epoch, frame, position, velocity, and optional propagation hints.

### Scope

- Add schema for manually authored state vectors.
- Validate units, exact frame names, origin, and epoch.
- Decide default propagation/display behavior for initial-state cases.
- Add example JSON fixture.
- Document limitations if propagation from arbitrary initial states is not implemented yet.

### Expected Files

- `src/orb_lab/scenarios.py`
- Example: `examples/scenarios/manual-initial-state.json`
- Tests: `tests/test_scenarios_initial_state.py`
- Possible docs update.

### Acceptance Criteria

- Valid initial-state JSON normalizes into the shared scenario model.
- Invalid units, missing vectors, unsupported frames, and naive epochs fail cleanly.
- The path is documented as display-only or experimental if propagation model choices are still limited.

### Implementation Plan

1. Add initial-state parser.
   - Require epoch, frame, position, velocity, and units.
   - Normalize units to km and km/s.
   - Require exact frame names.

2. Decide propagation intent.
   - If no arbitrary-state propagator exists yet, mark normalized scenario as initial-state/display-ready but not propagatable.
   - Avoid implying higher-fidelity dynamics that are not implemented.

3. Add examples and tests.
   - Valid EME2000 state.
   - Invalid broad frame name.
   - Invalid units.
   - Missing vector components.
   - Naive timestamp.

### Edge Cases

- Source vectors may be in meters and meters per second.
- QSW initial states require origin semantics that may not be meaningful without a reference trajectory.
- Users may expect propagation from initial state; document what is and is not supported.

### Increment Completion Notes

- Keep this path useful for hand-authored fixtures even if full initial-state propagation is deferred.
- Implemented during Increment 4: added hand-authored initial-state JSON normalization, bundled `manual-initial-state` example loading, route support for submitted initial-state JSON, and parser/route regression tests.
- The first initial-state subset accepts exact Goal 04 frames, timezone-aware epochs, geocentric or spacecraft origin metadata, direct `positionKm`/`velocityKmS` vectors, or generic `position`/`velocity` vectors with `km`/`km/s` or `m`/`m/s` units.
- Initial-state scenarios normalize to one display-ready `initial_state` plus a single sample; arbitrary-state propagation remains deferred.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- Manual load of the example JSON file.
- Verified during Increment 4 with `uv run pytest` (`67 passed`, `11 skipped`), `uv run ruff check .`, and `UV_CACHE_DIR=/Users/kcourter/dev/orb/.uv-cache OREKIT_DATA_PATH=/Users/kcourter/dev/orb/orekit-data.zip uv run pytest` (`78 passed`).

### Approval Question

Approve initial-state semantics before adding frontend selection.

## Increment 5: Frontend Scenario Selection and Validation Feedback

### Objective

Expose scenario loading in the web app without making the browser parse every source format.

### Scope

- Add compact scenario selection/load controls.
- Support selecting bundled examples first.
- Optionally support pasted text or file content through the API.
- Display validation errors near the input.
- Refresh propagation or display when a scenario is loaded.

### Expected Files

- `apps/web/src/api/scenarios.ts`
- `apps/web/src/ui/scenarioControls.ts`
- `apps/web/src/state/scenarioState.ts`
- `apps/web/src/main.ts`
- `apps/web/src/styles.css`
- `apps/web/tests/orbit-scene.smoke.spec.ts`

### Acceptance Criteria

- A user can load an ISS TLE scenario and see the visualization update.
- API validation errors are displayed without breaking the scene.
- Frontend code does not duplicate Python parsing logic beyond lightweight client validation.
- Loaded scenario metadata is visible enough to avoid confusing source/frame state.

### Implementation Plan

1. Add scenario API client.
   - Fetch examples.
   - Normalize submitted source text if included.
   - Return structured error results like the propagation client.

2. Add scenario state.
   - Track active scenario source, name, frame, and load status.
   - Keep scenario state separate from sampling and frame selection controls.

3. Add controls.
   - Use a compact example selector and load action.
   - Add text/file input only if approved for the first UI pass.
   - Show errors locally.

4. Wire visualization.
   - For TLE scenarios, update the active TLE used for local sampling and Orekit refresh.
   - For OEM/initial-state display scenarios, use the normalized samples/display data if available.
   - Clear stale traces and metrics after scenario changes.

5. Add smoke coverage.
   - Load ISS example.
   - Verify request/update path.
   - Verify error response preserves scene.

### Edge Cases

- Scenario load while Orekit request is in flight.
- Scenario frame differs from selected display frame.
- OEM scenario has samples but no TLE.
- Initial-state scenario is not propagatable yet.
- Example list API unavailable.

### Increment Completion Notes

- Prefer one excellent example-load path over a cluttered importer UI.
- Keep controls compact; this remains an analysis tool, not a file-management app.
- Implemented during Increment 5: added frontend scenario API client/types, active scenario state, compact example selector controls, TLE scenario handoff to local satellite.js/Orekit refresh, normalized sample display for OEM/manual scenarios, and scenario load error feedback.
- The first UI pass intentionally supports bundled example selection only; paste/file submission remains deferred so parsing stays backend-owned without crowding the scene controls.
- Sample-only scenarios display their normalized samples and leave Orekit refresh in a no-TLE state until a later propagation path exists.

### Validation

- `CI=true pnpm --dir apps/web check`
- `CI=true pnpm --dir apps/web build`
- `CI=true pnpm --dir apps/web smoke`
- Manual browser scenario-load smoke test.
- Verified during Increment 5 with `pnpm --dir apps/web check`, `pnpm --dir apps/web build`, `CI=true pnpm --dir apps/web smoke` (`6 passed`), and desktop/narrow Playwright screenshot checks against `http://127.0.0.1:5173/`.

### Approval Question

Approve UX behavior before final fixtures and records.

## Increment 6: Fixtures, Regression Tests, and Completion Record

### Objective

Make loader behavior repeatable and document the scenario workflow.

### Scope

- Add or finalize fixtures for TLE, OEM/CCSDS, and initial-state scenarios.
- Add regression tests around normalization and common failure cases.
- Document API and frontend workflow for loading scenarios.
- Record commands run and manual browser checks.
- Update Goal 05 README and top-level goal index only after validation.

### Expected Files

- Fixtures under `tests/fixtures/scenarios/`
- Examples under `examples/scenarios/`
- `docs/goals/05-data-loader-path/README.md`
- New file: `docs/goals/05-data-loader-path/RECORD.md`
- `docs/goals/README.md`

### Acceptance Criteria

- All supported loader paths have representative fixtures.
- Tests cover success and common failure cases.
- A developer can reproduce the scenario loading workflow locally.
- The record states which paths are propagatable, display-only, or experimental.

### Implementation Plan

1. Complete fixture coverage.
   - TLE success and failure fixtures.
   - OEM success and failure fixtures.
   - Initial-state success and failure fixtures.

2. Complete validation coverage.
   - Backend parser/model tests.
   - Frontend API/client smoke where applicable.
   - Browser smoke for example loading.

3. Update docs.
   - Mark Goal 05 README complete.
   - Add `RECORD.md`.
   - Link examples and commands.
   - Capture known risks and deferred source formats.

4. Handoff to next work.
   - Document scenario metadata expected by future propagation/display goals.
   - Note any limitations around arbitrary initial-state propagation or OEM interpolation.

### Final Documentation Checklist

- Goal 05 README marks the goal complete and links to `RECORD.md`.
- `RECORD.md` lists supported source types, examples, commands run, and known risks.
- Top-level `docs/goals/README.md` marks Goal 05 complete only after implementation and validation.
- Example files are discoverable from docs.

### Final Validation Matrix

- Valid TLE example.
- Invalid TLE text.
- Valid OEM fixture.
- Invalid OEM fixture.
- Valid initial-state JSON.
- Invalid initial-state JSON.
- Frontend example list success.
- Frontend scenario load success.
- Frontend scenario load error.
- Browser scene remains nonblank after scenario load.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- `CI=true pnpm --dir apps/web check`
- `CI=true pnpm --dir apps/web build`
- `CI=true pnpm --dir apps/web smoke`
- Manual scenario-load smoke test.

### Approval Question

Approve completion and decide the next exploration track.

## Open Decisions

- Whether examples live only under `examples/scenarios/` or also under `tests/fixtures/scenarios/`.
- Whether `POST /scenarios/normalize` accepts multipart files in Goal 05 or only text/JSON.
- How much OEM/CCSDS parsing should be accepted before full Orekit data setup is mandatory.
- Whether arbitrary initial-state propagation belongs in Goal 05 or a later dynamics goal.
- Whether browser file upload is included in the first UI pass.

## Not In Scope

- Persistent scenario databases.
- Authentication or multi-user storage.
- Full CCSDS coverage beyond the first useful OEM path.
- High-fidelity arbitrary-state propagation.
- Maneuver design or mission planning workflows.
