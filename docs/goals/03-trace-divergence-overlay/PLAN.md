# Trace Divergence Overlay Increment Plan

## Goal

Overlay browser-side `satellite.js` samples with Python/Orekit samples and compute divergence over a shared sampling window.

Each increment should be approved before implementation. This goal is where the app starts behaving like an analysis tool rather than a single-source visualizer.

## Increment 1: Propagation API Client

### Objective

Add a frontend client for the Orekit propagation endpoint from Goal 02.

### Scope

- Create typed request and response objects matching the Python API contract.
- Add a small fetch client with explicit error handling.
- Keep API calls outside Three.js scene modules.
- Add a local API base URL strategy suitable for Vite development.

### Expected Files

- New module: `apps/web/src/api/propagation.ts`
- Possible module: `apps/web/src/config.ts`
- Update: `apps/web/src/main.ts`

### Acceptance Criteria

- The frontend can request Orekit samples for the current TLE and sampling settings.
- API failures return structured state that the UI can display or ignore gracefully.
- No scene rendering code directly constructs fetch requests.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- Manual request with the Python API running.

### Approval Question

Approve the client contract before adding sample alignment.

## Increment 2: Sample Alignment Layer

### Objective

Align `satellite.js` and Orekit samples by epoch before comparing positions.

### Scope

- Add a pure TypeScript alignment function.
- Decide exact-match versus tolerance-based epoch matching.
- Preserve metadata for skipped or unmatched samples.
- Keep distance calculations separate from rendering.

### Expected Files

- New module: `apps/web/src/orbits/alignment.ts`
- Possible test fixtures: `apps/web/src/orbits/alignment.fixtures.ts`

### Acceptance Criteria

- Aligned pairs are deterministic for equal sampling settings.
- Missing or extra samples are reported rather than silently ignored.
- The layer is usable without Three.js.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- Unit tests if a frontend test runner has been introduced; otherwise typed fixture checks.

### Approval Question

Approve the alignment rules before computing divergence.

## Increment 3: Dual Trace Rendering

### Objective

Render both propagation traces clearly in the same scene.

### Scope

- Add source-aware trace materials and marker styling.
- Keep both traces visible without visual clutter.
- Add minimal labels or legend controls only if needed for clarity.
- Handle loading and error states without collapsing the scene.

### Expected Files

- `apps/web/src/scene/orbitTrace.ts`
- `apps/web/src/main.ts`
- Possible module: `apps/web/src/ui/status.ts`

### Acceptance Criteria

- `satellite.js` and Orekit traces are visually distinguishable.
- The scene remains useful if the API is offline.
- The rendering layer accepts generic sampled vectors, not hard-coded propagation sources.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- Manual browser smoke test with API online and offline.

### Approval Question

Approve the visual treatment before adding metrics.

## Increment 4: Divergence Metrics and Readout

### Objective

Compute and expose distance divergence between aligned samples.

### Scope

- Add Euclidean distance calculation in kilometers.
- Compute max, mean, and current-sample divergence.
- Add a compact readout that does not occlude the scene.
- Preserve enough data for later charts or timeline scrubbing.

### Expected Files

- New module: `apps/web/src/orbits/divergence.ts`
- Possible module: `apps/web/src/ui/divergenceReadout.ts`
- Update: `apps/web/src/main.ts`

### Acceptance Criteria

- Metrics are computed from aligned sample pairs only.
- The readout updates with the animated/current sample.
- Empty or invalid comparisons display a clear nonfatal state.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- Manual verification with known identical fixture data if available.

### Approval Question

Approve metric names and display before final documentation.

## Increment 5: Tests, Fixtures, and Handoff Record

### Objective

Make the comparison behavior repeatable and document what Goal 04 can rely on.

### Scope

- Add fixtures for aligned samples and expected divergence metrics.
- Add tests if the frontend test harness exists by this point.
- Document frame assumptions, sample alignment behavior, and known comparison limits.
- Record commands run and manual browser checks.

### Expected Files

- `docs/goals/03-trace-divergence-overlay/README.md`
- Possible new file: `docs/goals/03-trace-divergence-overlay/RECORD.md`
- Possible tests under `apps/web/src`

### Acceptance Criteria

- Divergence math has repeatable fixture coverage or documented manual verification.
- Goal 04 has clear expectations for available sample metadata and scene update paths.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `uv run pytest`
- Browser smoke test with API running.

### Approval Question

Approve completion and handoff before moving to frame controls.

## Open Decisions

- Epoch alignment tolerance.
- Whether to introduce Vitest in this goal or earlier.
- Whether divergence readout is text-only or includes a small sparkline.
- Whether API requests are automatic on settings change or manually refreshed.

## Not In Scope

- New propagation models.
- Frame selector UI.
- Data loader scenarios.
- Long-running API caching.
