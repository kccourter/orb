# Data Loader Path Increment Plan

## Goal

Support repeatable scenario loading for TLE, OEM/CCSDS, and hand-authored initial states through a normalized API and frontend workflow.

Each increment should be approved before implementation. This goal should make experiments easy to swap without hard-coding source data into the scene.

## Increment 1: Scenario Schema and Source Taxonomy

### Objective

Define the normalized scenario model shared by API routes, parsers, fixtures, and frontend selection.

### Scope

- Define source types: `tle`, `oem_ccsds`, and `initial_state`.
- Decide required metadata: name, object id, epoch, source frame, units, and propagation intent.
- Add Pydantic models and TypeScript mirrors only as needed.
- Decide whether scenarios are submitted directly or loaded from a server-side examples directory.

### Expected Files

- `src/orb_lab/models.py`
- Possible module: `src/orb_lab/scenarios.py`
- Possible frontend types: `apps/web/src/api/scenarios.ts`
- Goal docs update.

### Acceptance Criteria

- A single normalized scenario shape can represent all three source families.
- Invalid source type and missing metadata errors are explicit.
- The model does not require full OEM parsing to be useful.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- `pnpm --dir apps/web check` if frontend types are added.

### Approval Question

Approve the scenario schema before adding source-specific loaders.

## Increment 2: TLE Loader

### Objective

Load TLE scenarios from pasted text, structured JSON, or example files.

### Scope

- Add TLE parser/validator that normalizes into the scenario schema.
- Preserve raw TLE lines in metadata for traceability.
- Add one ISS example scenario.
- Wire the loader to existing propagation request construction.

### Expected Files

- `src/orb_lab/scenarios.py`
- Possible examples: `examples/scenarios/iss.tle`
- Tests: `tests/test_scenarios_tle.py`

### Acceptance Criteria

- Valid two-line and optional-name TLE inputs load successfully.
- Invalid line counts/checks return useful errors.
- Loaded TLE scenarios can be propagated through the existing endpoint path.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- Manual API request using the example TLE.

### Approval Question

Approve TLE loader behavior before adding OEM/CCSDS.

## Increment 3: OEM/CCSDS Loader

### Objective

Load CCSDS OEM data through Orekit where practical and normalize it for visualization.

### Scope

- Add OEM file/text ingestion path.
- Use Orekit parsing support if available in the current wrapper.
- Normalize ephemeris segments into sample data or scenario metadata.
- Add a small fixture with permissive licensing or hand-authored minimal content.

### Expected Files

- `src/orb_lab/scenarios.py`
- Possible module: `src/orb_lab/ccsds.py`
- Fixture under `tests/fixtures/` or `examples/scenarios/`
- Tests: `tests/test_scenarios_oem.py`

### Acceptance Criteria

- A representative OEM fixture loads into normalized data.
- Parser errors identify the format issue clearly.
- Time scale and frame metadata survive normalization.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- Manual load of the example OEM file.

### Approval Question

Approve OEM handling before adding hand-authored state input.

## Increment 4: Hand-Authored Initial State Loader

### Objective

Allow users to define a scenario from explicit epoch, frame, position, velocity, and optional propagation hints.

### Scope

- Add schema for manually authored state vectors.
- Validate units, frame names, and epoch.
- Decide default propagation model for initial-state cases.
- Add example JSON fixture.

### Expected Files

- `src/orb_lab/scenarios.py`
- Example: `examples/scenarios/manual-initial-state.json`
- Tests: `tests/test_scenarios_initial_state.py`

### Acceptance Criteria

- Valid initial-state JSON normalizes into the shared scenario model.
- Invalid units, missing vectors, and unsupported frames fail cleanly.
- The path is documented as experimental if propagation model choices are still limited.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- Manual load of the example JSON file.

### Approval Question

Approve initial-state semantics before adding frontend selection.

## Increment 5: Frontend Scenario Selection

### Objective

Expose scenario loading in the web app without making the browser parse every source format.

### Scope

- Add a compact scenario selection/load control.
- Support selecting bundled examples or submitting text/file content to the API.
- Display validation errors near the input.
- Refresh propagation and visualization when a scenario is loaded.

### Expected Files

- `apps/web/src/api/scenarios.ts`
- `apps/web/src/ui/scenarioControls.ts`
- `apps/web/src/main.ts`
- Possible CSS update.

### Acceptance Criteria

- A user can load an ISS TLE scenario and see the visualization update.
- API validation errors are displayed without breaking the scene.
- Frontend code does not duplicate Python parsing logic beyond lightweight client validation.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- Manual browser smoke test.

### Approval Question

Approve UX behavior before final fixtures and records.

## Increment 6: Fixtures, Regression Tests, and Completion Record

### Objective

Make loader behavior repeatable and document the scenario workflow.

### Scope

- Add or finalize fixtures for TLE, OEM/CCSDS, and initial-state scenarios.
- Add regression tests around normalization and error cases.
- Document API and frontend workflow for loading scenarios.
- Record commands run and manual browser checks.

### Expected Files

- Fixtures under `tests/fixtures/` or `examples/scenarios/`
- `docs/goals/05-data-loader-path/README.md`
- Possible new file: `docs/goals/05-data-loader-path/RECORD.md`
- Possible README update if workflow changes.

### Acceptance Criteria

- All supported loader paths have representative fixtures.
- Tests cover success and common failure cases.
- A developer can reproduce the scenario loading workflow locally.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- Manual scenario-load smoke test.

### Approval Question

Approve completion and decide the next exploration track.

## Open Decisions

- Whether examples live under `examples/scenarios/`, `docs/examples/`, or API-owned fixture paths.
- Whether scenario loading is a new endpoint or part of the propagation endpoint.
- How much OEM/CCSDS parsing should be accepted before full Orekit data setup is mandatory.
- Default propagation model for hand-authored initial states.
- Whether browser file upload is included in the first UI pass.

## Not In Scope

- Mission planning workflows.
- Persistent scenario databases.
- Authentication or multi-user storage.
- Full CCSDS coverage beyond the first useful OEM path.
