# Trace Divergence Overlay Increment Plan

## Goal

Overlay browser-side `satellite.js` samples with Python/Orekit samples and compute divergence over a shared sampling window.

Each increment should be approved before implementation. This goal is where the app starts behaving like an analysis tool rather than a single-source visualizer.

## Branch Goal

Add an offline-tolerant comparison path between the existing browser `satellite.js` preview and the Goal 02 Orekit endpoint. The branch should end with the web app able to request Orekit samples for the current ISS TLE/settings, align both sample sets by epoch, render source-distinct traces, and show compact divergence metrics without changing the authoritative propagation API.

## Starting Context

- Goal 01 samples the bundled ISS TLE in the browser with `satellite.js`.
- Goal 01 labels browser samples as `TEME`, with positions in kilometers and velocities in kilometers per second.
- Goal 01 renders one trace and one animated marker through `createOrbitScene`.
- Goal 01 settings default to epoch `2024-06-21T13:31:24Z`, duration `92.5` minutes, and step `30` seconds.
- Goal 02 exposes `POST /propagate/tle`.
- Goal 02 returns native Orekit TLE samples in `TEME`, with positions in kilometers and velocities in kilometers per second.
- Goal 02 live propagation requires the API process to run with `OREKIT_DATA_PATH` set.
- Goal 02 Orekit sampling is inclusive: `floor(duration_seconds / step_seconds) + 1`, so the Goal 01 defaults return 186 Orekit samples.

## Proposed UX Defaults

- Request mode: manual refresh button first, not automatic fetch on every setting change.
- API base URL: default to `http://127.0.0.1:8000`, overridable with a Vite environment variable if needed.
- Offline behavior: keep the local `satellite.js` trace visible and show a compact nonfatal API status.
- Rendering: preserve the existing `satellite.js` trace color and add a second clearly distinct Orekit trace color.
- Metrics: text-only compact readout for current, max, mean, aligned count, and unmatched counts; no chart/sparkline in Goal 03.
- Frame policy: compute divergence only when both sample sets report matching `TEME` frame labels and compatible units.

## Draft Frontend API Shape

Client request to Goal 02:

```ts
type PropagationApiRequest = {
  tle: {
    name?: string;
    line1: string;
    line2: string;
  };
  sampling: {
    start_epoch: string;
    duration_minutes: number;
    step_seconds: number;
  };
  frame: "native";
};
```

Client response shape:

```ts
type PropagationApiResponse = {
  source: {
    type: "tle";
    name?: string;
    propagator: "orekit-tle";
  };
  frame: {
    name: string;
    authority: "orekit";
    is_native: boolean;
  };
  units: {
    position: "km";
    velocity: "km/s";
  };
  sampling: {
    start_epoch: string;
    duration_minutes: number;
    step_seconds: number;
    sample_count: number;
  };
  samples: Array<{
    epoch: string;
    position_km: [number, number, number];
    velocity_km_s: [number, number, number];
  }>;
};
```

Frontend code should normalize this to an app-owned sample type before rendering or comparing.

## Alignment And Metrics Defaults

- Epoch key: ISO UTC string normalized to milliseconds precision with `Date.toISOString()`.
- Matching rule: exact normalized epoch key first.
- Tolerance: allow a small fallback tolerance of `1` millisecond only to absorb serialization differences, not sampling drift.
- Unmatched handling: report unmatched local and Orekit sample counts in metadata; do not silently stretch/interpolate in Goal 03.
- Distance: Euclidean position distance in kilometers from aligned sample pairs.
- Summary metrics: current sample distance, max distance, mean distance, aligned pair count, local-only count, and Orekit-only count.
- Animation mapping: use the current `satellite.js` animation frame epoch to find the nearest aligned divergence sample for the readout.

## Validation And Test Strategy

- Keep pure alignment and divergence math independent from Three.js.
- Prefer TypeScript fixture checks or the existing Playwright smoke path over adding Vitest in this goal.
- Add Vitest only if fixture checks become awkward or the repo has already accepted a frontend test runner by implementation time.
- Continue running `pnpm --dir apps/web check`, `pnpm --dir apps/web build`, and `pnpm --dir apps/web smoke`.
- With the API running, manually verify API online and offline behavior at desktop and narrow widths.
- Keep `uv run pytest` in final validation because Goal 03 depends on the Goal 02 endpoint.

## Increment Dependency Map

1. Increment 1 adds the frontend API client and state boundary.
2. Increment 2 aligns local and Orekit samples by epoch and validates comparison preconditions.
3. Increment 3 extends the scene for dual traces and API status.
4. Increment 4 computes and displays divergence metrics.
5. Increment 5 adds repeatable fixtures, visual QA notes, and handoff documentation.

## Increment 1: Propagation API Client

### Objective

Add a frontend client for the Orekit propagation endpoint from Goal 02.

### Scope

- Create typed request and response objects matching the Python API contract.
- Add a small fetch client with explicit error handling.
- Keep API calls outside Three.js scene modules.
- Add a local API base URL strategy suitable for Vite development.
- Add a manual refresh command to the existing controls or a small adjacent control surface.
- Normalize API samples into frontend-owned sample objects with frame and unit metadata.

### Expected Files

- New module: `apps/web/src/api/propagation.ts`
- Possible module: `apps/web/src/config.ts`
- Possible update: `apps/web/src/ui/controls.ts`
- Update: `apps/web/src/main.ts`

### Acceptance Criteria

- The frontend can request Orekit samples for the current TLE and sampling settings.
- API failures return structured state that the UI can display or ignore gracefully.
- No scene rendering code directly constructs fetch requests.
- The local `satellite.js` trace remains usable when the API is offline.
- API requests use the current normalized Goal 01 settings and bundled ISS TLE.

### Implementation Plan

1. Add API types and client.
   - Create `apps/web/src/api/propagation.ts`.
   - Export request/response types, an app-owned normalized Orekit sample type, and `fetchTlePropagation(request, options)`.
   - Convert snake_case API fields to frontend camelCase at the boundary.

2. Add API base URL config.
   - Default to `http://127.0.0.1:8000`.
   - Allow a Vite env override such as `VITE_ORB_API_BASE_URL`.
   - Keep the URL out of scene modules.

3. Add request construction.
   - Map `ISS_TLE` and normalized `OrbitSettings` to the Goal 02 request body.
   - Use `frame: "native"`.
   - Do not fetch automatically during every keystroke; trigger through a manual refresh action.

4. Add API state in `main.ts`.
   - Track idle, loading, ready, and error states.
   - Retain the previous local trace if the API request fails.
   - Keep local `satellite.js` recomputation synchronous and independent.

5. Validate the client.
   - Run frontend type/build checks.
   - With the Python API running, make one manual request from the browser flow.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`
- Manual request with the Python API running.

### Approval Question

Approve the client contract before adding sample alignment.

## Increment 2: Sample Alignment Layer

### Objective

Align `satellite.js` and Orekit samples by epoch before comparing positions.

### Scope

- Add a pure TypeScript alignment function.
- Use exact normalized epoch matching with a `1` millisecond fallback tolerance for serialization differences.
- Preserve metadata for skipped or unmatched samples.
- Keep distance calculations separate from rendering.
- Validate matching frame and units before returning comparable pairs.

### Expected Files

- New module: `apps/web/src/orbits/alignment.ts`
- Possible test fixtures: `apps/web/src/orbits/alignment.fixtures.ts`
- Possible module: `apps/web/src/orbits/sampleTypes.ts`

### Acceptance Criteria

- Aligned pairs are deterministic for equal sampling settings.
- Missing or extra samples are reported rather than silently ignored.
- The layer is usable without Three.js.
- Frame or unit mismatch returns a nonfatal comparison error state.
- Alignment output includes enough epoch metadata for readout and animation mapping.

### Implementation Plan

1. Define common sample interfaces.
   - Add a shared frontend sample shape for source, epoch, frame, position, and velocity.
   - Provide adapters for `TleOrbitSample` and normalized Orekit samples.

2. Implement alignment.
   - Normalize epochs with `Date.toISOString()`.
   - Build maps by epoch key.
   - Pair exact keys first; use the `1` millisecond tolerance only for unpaired leftovers.
   - Return aligned pairs plus local-only and Orekit-only sample lists.

3. Validate comparison preconditions.
   - Require matching frame labels before distance metrics.
   - Require positions in kilometers.
   - Return typed errors that UI can display without throwing away the local trace.

4. Add fixture checks.
   - Include equal-epoch, missing-sample, extra-sample, and frame-mismatch fixtures.
   - If no test runner is added, expose typed fixture assertions that compile under `pnpm --dir apps/web check`.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`
- Unit tests if a frontend test runner has been introduced; otherwise typed fixture checks.

### Approval Question

Approve the alignment rules before computing divergence.

## Increment 3: Dual Trace Rendering

### Objective

Render both propagation traces clearly in the same scene.

### Scope

- Add source-aware trace materials and marker styling.
- Keep both traces visible without visual clutter.
- Add minimal status/legend text integrated with controls or a compact readout.
- Handle loading and error states without collapsing the scene.
- Extend the scene API to manage multiple named traces without duplicating scene setup.

### Expected Files

- `apps/web/src/scene/createScene.ts`
- `apps/web/src/scene/orbitTrace.ts`
- `apps/web/src/main.ts`
- Possible module: `apps/web/src/ui/status.ts`
- Possible update: `apps/web/src/styles.css`

### Acceptance Criteria

- `satellite.js` and Orekit traces are visually distinguishable.
- The scene remains useful if the API is offline.
- The rendering layer accepts generic sampled vectors, not hard-coded propagation sources.
- Updating or clearing the Orekit trace does not disturb the local trace or marker animation.
- Desktop and narrow viewport layouts remain readable.

### Implementation Plan

1. Extend scene trace handling.
   - Replace the single `setOrbitPoints` surface with named trace operations or add a second method such as `setComparisonOrbitPoints`.
   - Keep marker animation tied to the local `satellite.js` path for Goal 03 unless a later increment explicitly adds an Orekit marker.

2. Generalize trace conversion.
   - Convert any sample with `positionKm` into scene points.
   - Preserve the scene scaling boundary of 1 Three.js unit per 1,000 kilometers.

3. Add visual distinction.
   - Keep the existing local trace color for `satellite.js`.
   - Add a distinct Orekit trace color and, if needed, a subtle opacity or line width distinction supported by Three.js.

4. Add status UI.
   - Show loading, ready, error, and offline states compactly.
   - Keep the UI operational and restrained; avoid a dashboard layout.

5. Verify visually.
   - API online: both traces visible.
   - API offline: local trace visible and error state shown.
   - Desktop and narrow viewport smoke.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`
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
- Update the readout from the existing animation loop without coupling metric computation to Three.js geometry.

### Expected Files

- New module: `apps/web/src/orbits/divergence.ts`
- Possible module: `apps/web/src/ui/divergenceReadout.ts`
- Update: `apps/web/src/main.ts`
- Possible update: `apps/web/src/styles.css`

### Acceptance Criteria

- Metrics are computed from aligned sample pairs only.
- The readout updates with the animated/current sample.
- Empty or invalid comparisons display a clear nonfatal state.
- Metrics identify source pair and frame, at minimum `satellite.js TEME` versus `Orekit TEME`.
- The readout shows current, max, mean, aligned count, and unmatched counts.

### Implementation Plan

1. Add divergence helpers.
   - Compute Euclidean distance between aligned position vectors in kilometers.
   - Return per-pair distances keyed by epoch.
   - Compute max and mean from aligned pairs only.

2. Add current-sample lookup.
   - Use the current local sample epoch from the animation loop.
   - Find exact epoch match in the divergence series first, then nearest aligned epoch if needed.

3. Add compact readout UI.
   - Display loading/error/no-comparison states.
   - Display current, max, mean, aligned pair count, and unmatched counts.
   - Keep copy factual and source-aware, not explanatory prose.

4. Verify edge cases.
   - No Orekit samples.
   - Frame mismatch.
   - Zero aligned pairs.
   - Missing local or Orekit samples.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`
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
- Update Goal 03 README and create a completion record.

### Expected Files

- `docs/goals/03-trace-divergence-overlay/README.md`
- Possible new file: `docs/goals/03-trace-divergence-overlay/RECORD.md`
- Possible update: `docs/goals/04-frame-controls/README.md`
- Possible tests under `apps/web/src`

### Acceptance Criteria

- Divergence math has repeatable fixture coverage or documented manual verification.
- Goal 04 has clear expectations for available sample metadata and scene update paths.
- The record states whether Goal 03 uses exact `TEME` comparison only.
- The record captures API online/offline visual QA and any known latency/error behavior.

### Implementation Plan

1. Add fixture coverage.
   - Cover alignment, skipped samples, frame mismatch, and simple distance metrics.
   - Prefer compile-time fixture checks or existing smoke coverage unless a frontend test runner is already added.

2. Update docs.
   - Mark Goal 03 README complete when implemented.
   - Document API base URL behavior, manual refresh behavior, alignment rules, and metric names.
   - Add `RECORD.md` with commands run and visual QA notes.

3. Handoff to Goal 04.
   - Record that Goal 03 compares native `TEME` samples only.
   - Note scene APIs and sample metadata available for frame controls.
   - Keep frame transforms out of Goal 03.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`
- `uv run pytest`
- Browser smoke test with API running.

### Approval Question

Approve completion and handoff before moving to frame controls.

## Resolved Planning Decisions

- Epoch alignment uses exact normalized ISO keys first, with a `1` millisecond fallback tolerance.
- Do not introduce Vitest by default; use fixture checks and existing Playwright smoke unless implementation pressure justifies a test runner.
- Divergence readout is text-only in Goal 03.
- API requests are manually refreshed in Goal 03, not automatic on every settings change.

## Not In Scope

- New propagation models.
- Frame selector UI.
- Data loader scenarios.
- Long-running API caching.
