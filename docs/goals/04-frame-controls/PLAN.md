# Frame Controls Increment Plan

## Goal

Add controls for inspecting trajectories in inertial, Earth-fixed, and local orbital frame views without obscuring propagation source or comparison semantics.

Each increment should be approved before implementation. This goal is intentionally careful because frame mistakes can make a polished visualization analytically wrong.

## Branch Goal

Extend the Goal 02/03 TLE comparison path so the user can choose a documented display frame, request authoritative Orekit samples in that frame, render the selected-frame traces coherently, and keep divergence metrics tied to the same selected-frame sample set. Goal 04 should end with stable frame naming and enough tests/records for Goal 05 scenario data to rely on those names.

## Starting Context

- Goal 01 browser `satellite.js` samples are labeled `TEME`.
- Goal 02 `POST /propagate/tle` currently accepts only `frame: "native"` and returns Orekit native TLE samples, `TEME` for the ISS fixture.
- Goal 03 compares native `TEME` samples only, aligns by epoch, renders named traces, and computes divergence from aligned pairs.
- Goal 03 scene APIs support `setTracePoints(traceId, points)` and `clearTrace(traceId)` for `satellite-js` and `orekit`.
- Goal 03 frontend comparable samples carry source, epoch, frame, position units, velocity units, position, and velocity.
- Goal 03 divergence metrics assume both sources are in the same frame.

## Proposed Frame Policy

Use exact technical frame identifiers in API payloads and compact UI labels on top of them:

- `native`: existing compatibility mode; returns the propagator native frame, currently `TEME` for TLE.
- `TEME`: explicit TLE inertial-ish frame used by both `satellite.js` and Orekit native TLE output.
- `EME2000`: first explicit inertial frame option; UI label may be `ECI (EME2000)`.
- `ITRF`: first Earth-fixed frame option; UI label may be `ECEF (ITRF)`.
- `QSW`: first local orbital frame option, centered on the propagated object.

Increment 1 must confirm or revise this policy before runtime changes. Avoid a bare API value of `ECI` because it hides the actual inertial frame.

## Local Frame Candidate

Prefer `QSW` for the first local orbital frame unless Increment 1 finds an Orekit/API reason to choose another convention:

- `Q`: radial direction from central body to spacecraft position.
- `W`: angular momentum direction, proportional to `r x v`.
- `S`: completes the right-handed triad.

This keeps the local frame trajectory-relative and easier to define numerically than a camera-only local view. The implementation should document whether returned vectors are absolute coordinates expressed in the frame or local coordinates relative to the spacecraft origin.

## API Shape Candidate

Request shape should remain backward-compatible:

```ts
type PropagationFrameRequest = "native" | "TEME" | "EME2000" | "ITRF" | "QSW";
```

Response frame metadata should distinguish requested and realized frame:

```ts
type FrameMetadata = {
  name: string;
  authority: "orekit";
  is_native: boolean;
  requested?: string;
  source?: string;
};
```

If `QSW` is centered on the spacecraft, the response must state that clearly before the frontend renders it as a normal global trace.

## UX Defaults

- Use a compact segmented/select control near the existing propagation controls or Orekit overlay.
- Keep frame selection separate from epoch, duration, and step settings.
- Frame changes should not mutate local sampling settings.
- For frames that require Orekit transforms, show loading/error status and preserve the previous usable scene.
- Do not auto-refresh on every sampling edit unless the existing Goal 03 refresh behavior changes intentionally.
- Show the selected frame in the overlay/readout so users know what the trace and divergence metrics represent.

## Validation And Test Strategy

- Prefer Orekit for authoritative transforms.
- Add backend tests for accepted/rejected frame names and response metadata.
- Add numerical spot checks that are stable enough to catch wrong frame wiring without pinning brittle full ephemerides.
- Keep browser smoke tests focused on selector state, request shape, nonblank canvas, and stale-data behavior.
- Run `uv run pytest`, `uv run ruff check .`, `CI=true pnpm --dir apps/web check`, `CI=true pnpm --dir apps/web build`, and `CI=true pnpm --dir apps/web smoke` as the final validation set when relevant.

## Increment Dependency Map

1. Increment 1 locks frame names, local-frame convention, and response semantics.
2. Increment 2 extends the API/model/propagation adapter for explicit frame requests.
3. Increment 3 adds frontend frame selection state and request wiring.
4. Increment 4 renders selected-frame traces and keeps metrics coherent.
5. Increment 5 adds transform checks, browser QA notes, and completion/handoff docs.

## Increment 1: Frame Definitions and Naming Policy

### Objective

Decide and document exact frame names, transform ownership, and the first local orbital frame convention before touching runtime code.

### Scope

- Define API values for native, explicit inertial, Earth-fixed, and local orbital requests.
- Define UI labels that map to those API values without hiding technical meaning.
- Decide whether `TEME` remains selectable as an explicit frame or only as `native` output.
- Confirm `EME2000` as the first explicit inertial frame or choose a different Orekit-supported frame.
- Confirm `ITRF` as the first Earth-fixed frame and note Orekit data requirements.
- Confirm `QSW` or choose `TNW`/`LVLH`, including axis definitions and origin semantics.
- Decide whether the browser ever transforms `satellite.js` samples directly in Goal 04 or whether transformed comparison relies on Orekit samples.

### Expected Files

- New file: `docs/goals/04-frame-controls/FRAMES.md`
- Update: `docs/goals/04-frame-controls/README.md`
- Possible update: `docs/goals/02-orekit-pv-endpoint/API.md`

### Acceptance Criteria

- Frame names are unambiguous across API payloads, UI labels, and docs.
- The first local orbital frame has documented axes, origin, handedness, and units.
- Transform ownership is explicit: Orekit owns authoritative frame transforms.
- Goal 04 implementation can proceed without using bare `ECI` as an API frame value.

### Implementation Plan

1. Create the frame policy document.
   - Add `docs/goals/04-frame-controls/FRAMES.md`.
   - Define every approved API frame value, UI label, Orekit source, output semantics, and comparison safety.
   - Include a short glossary explaining why `ECI` and `ECEF` are UI categories, not precise API values.

2. Lock the initial frame set.
   - Confirm `native`, `TEME`, `EME2000`, `ITRF`, and `QSW`, or replace any of them with a better Orekit-supported name.
   - State which frame is the default selected frontend value.
   - State whether `native` remains visible to users or only exists for API compatibility.

3. Define local-frame semantics.
   - Write the `QSW` axis definitions.
   - Decide whether local-frame samples are object-relative coordinates, a rendered axes overlay, or both.
   - State how local-frame samples should be represented in response metadata.

4. Decide comparison behavior.
   - Document when divergence metrics are allowed.
   - Decide whether non-`TEME` comparisons require transformed `satellite.js` samples, Orekit-only display, or hidden metrics.
   - Keep interpolation out of scope unless explicitly added later.

5. Update high-level docs.
   - Link `FRAMES.md` from the Goal 04 README.
   - Add a short note to the Goal 02 API docs if the planned request frame enum changes the public contract.

### Planned Frame Table

`FRAMES.md` should include a table with at least:

- API value
- UI label
- Category
- Orekit frame or construction path
- Output origin
- Output units
- Whether it is comparison-safe with local `satellite.js` samples
- Notes and known caveats

### Edge Cases

- `TEME` may be available both as native TLE output and as an explicit request.
- `ITRF` may need Earth orientation data from Orekit data files.
- `QSW` can be nonsensical if position or angular momentum vectors are degenerate.
- A local orbital frame centered on the spacecraft cannot be rendered as a normal geocentric orbit trace without an explicit design choice.

### Increment Completion Notes

- This increment should not change runtime behavior.
- A clear `FRAMES.md` is the main deliverable.
- Any unresolved frame decision should remain in an open-decision section before Increment 2 starts.
- Implemented during Increment 1: added `FRAMES.md`, linked it from the Goal 04 README, and added a Goal 02 API note that the broader frame enum is planned but not yet runtime-supported.
- Accepted frame policy: `native` remains the default compatibility request; explicit Goal 04 frame values are `TEME`, `EME2000`, `ITRF`, and `QSW`.
- Accepted comparison policy: only realized `TEME` is comparison-safe with current local `satellite.js` samples; transformed frames are Orekit display frames until a matching local transform exists.

### Validation

- Documentation review.
- No runtime validation required for this planning increment.
- Documentation-only validation completed during Increment 1.

### Approval Question

Approve frame definitions before implementation.

## Increment 2: Frame-Aware API and Propagation Adapter

### Objective

Allow the backend to return TLE samples in requested, documented frames while preserving native-frame compatibility.

### Scope

- Extend request models from `frame: "native"` to the approved frame enum.
- Preserve existing `native` request behavior for Goal 03 compatibility.
- Add frame resolution and transform helpers outside route handlers.
- Return metadata for requested frame, realized frame, native/source frame, and whether output is native.
- Reject unsupported frame names with clear validation errors.
- Add backend tests for request validation, metadata, and at least one transformed frame.

### Expected Files

- `src/orb_lab/models.py`
- `src/orb_lab/propagation.py`
- New module: `src/orb_lab/frames.py`
- `src/orb_lab/api.py`
- Tests under `tests/`
- Possible update: `docs/goals/02-orekit-pv-endpoint/API.md`

### Acceptance Criteria

- `frame: "native"` remains compatible with existing frontend calls.
- Approved explicit frames return samples with matching frame metadata.
- Unsupported frames fail before or during propagation with useful errors.
- Runtime/data failures still map to `503`; domain/frame propagation failures map to `400` or `422` according to validation ownership.
- The adapter returns finite kilometer and kilometer-per-second vectors for transformed samples.

### Implementation Plan

1. Extend model types.
   - Replace `Literal["native"]` with the approved frame enum from Increment 1.
   - Extend `FrameMetadata` to include requested frame and source/native frame metadata if approved.
   - Preserve response compatibility for existing fields: `name`, `authority`, and `is_native`.

2. Add frame helpers.
   - Create `src/orb_lab/frames.py`.
   - Resolve request values to Orekit frame objects or local orbital frame construction.
   - Keep imports and Orekit-specific failure handling outside Pydantic models.

3. Transform propagated state.
   - Continue propagating with Orekit's TLE propagator.
   - For `native`, return the current behavior.
   - For explicit inertial and Earth-fixed frames, transform PV coordinates at each sample epoch.
   - For local frame output, implement only the semantics approved in Increment 1.

4. Preserve error taxonomy.
   - Keep JVM/data initialization failures as `OrekitRuntimeError` and HTTP `503`.
   - Raise propagation/frame domain errors as `TlePropagationError`.
   - Keep schema-level unsupported frame values as `422` if using Pydantic enum validation.

5. Add tests.
   - Validate accepted frame names.
   - Validate rejected frame names.
   - Verify `native` remains `TEME` for the ISS fixture.
   - Verify at least one transformed frame has metadata and finite vectors.
   - Add data-enabled tests only where they can skip cleanly without Orekit data.

6. Update API documentation.
   - Update `docs/goals/02-orekit-pv-endpoint/API.md` to list accepted frame values and metadata semantics.
   - Note which frames require Orekit data and which are intended for Goal 04 display.

### Planned Backend Shape

```py
PropagationFrameRequest = Literal["native", "TEME", "EME2000", "ITRF", "QSW"]
```

`frames.py` should provide narrow helpers, such as:

```py
def resolve_output_frame(requested: PropagationFrameRequest, native_frame: object) -> ResolvedFrame:
    ...

def transform_pv_coordinates(pv: object, source_frame: object, target: ResolvedFrame, date: object) -> object:
    ...
```

The exact names can change, but route handlers should stay thin.

### Edge Cases

- Orekit frame imports may fail if the JVM/runtime is not initialized correctly.
- Earth-fixed frames may require data files that native TLE propagation already needed but should still surface cleanly.
- `native` and explicit `TEME` may produce equivalent vectors but different `is_native` metadata.
- Local orbital frame transforms may need velocity transformation as well as position transformation.
- Numerical tests should check broad invariants and metadata instead of brittle full-vector snapshots.

### Increment Completion Notes

- Frontend code may still request only `native` after this increment.
- The API contract should be ready for frontend frame selector work.
- Keep any unsupported local-frame behavior explicit rather than silently approximated.
- Implemented during Increment 2: request models now accept `native`, `TEME`, `EME2000`, `ITRF`, and `QSW`; frame metadata includes requested frame, source frame, and origin; propagation transforms explicit geocentric frames through Orekit and returns spacecraft-centered QSW samples.
- `src/orb_lab/frames.py` owns frame resolution and PV coordinate transforms so FastAPI route handlers stay thin.
- `native` remains backward-compatible and returns the TLE propagator frame, `TEME` for the ISS fixture.
- Unsupported broad names such as `ECI` still fail schema validation with `422`.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- Manual API request for each supported frame when `OREKIT_DATA_PATH` is available.
- Verified during Increment 2 with `uv run pytest`, `uv run ruff check .`, and `UV_CACHE_DIR=/Users/kcourter/dev/orb/.uv-cache OREKIT_DATA_PATH=/Users/kcourter/dev/orb/orekit-data.zip uv run pytest tests/test_tle_propagation.py`.
- Data-enabled full validation also passed with `UV_CACHE_DIR=/Users/kcourter/dev/orb/.uv-cache OREKIT_DATA_PATH=/Users/kcourter/dev/orb/orekit-data.zip uv run pytest`: 34 passed.
- A local FastAPI `TestClient` smoke returned HTTP `200` for `native`, `TEME`, `EME2000`, `ITRF`, and `QSW`; the process was interrupted after output because JPype can linger after JVM startup.

### Approval Question

Approve API changes before frontend state and controls.

## Increment 3: Frontend Frame Selection State

### Objective

Add compact frame selection UI and wire selected frame into propagation requests without changing unrelated sampling settings.

### Scope

- Add a frame selector component using the approved UI labels and API values.
- Store selected frame separately from epoch, duration, and step settings.
- Update the frontend API request type and request builder.
- Keep `native` or the approved default selected initially.
- On frame change, clear stale Orekit comparison data or mark it stale until the user refreshes.
- Preserve API-offline behavior from Goal 03.

### Expected Files

- New module: `apps/web/src/state/frameSettings.ts`
- New module: `apps/web/src/ui/frameControls.ts`
- `apps/web/src/api/propagation.ts`
- `apps/web/src/main.ts`
- `apps/web/src/styles.css`
- `apps/web/tests/orbit-scene.smoke.spec.ts`

### Acceptance Criteria

- Users can select the approved frame options.
- The next Orekit refresh sends the selected frame value.
- Frame changes do not reset epoch/duration/step controls.
- Stale Orekit traces and divergence metrics are not presented as current after a frame change.
- The local scene remains usable if the API is offline.

### Implementation Plan

1. Add frame state.
   - Create `apps/web/src/state/frameSettings.ts`.
   - Export approved API values, UI labels, default selected frame, and a normalizer.
   - Keep this separate from `OrbitSettings`.

2. Add frame control UI.
   - Create `apps/web/src/ui/frameControls.ts`.
   - Use a compact segmented or select control depending on available width and existing CSS patterns.
   - Expose one change callback with the selected frame value.

3. Update API request typing.
   - Update `PropagationApiRequest["frame"]` to the approved frontend type.
   - Pass selected frame into `buildTlePropagationRequest`.
   - Update smoke fixtures to assert selected frame is sent.

4. Wire app orchestration.
   - Store `currentFrame`.
   - On frame change, clear Orekit trace, alignment, divergence, and status or mark them stale.
   - Keep local `satellite.js` sampling and marker animation unchanged unless Increment 4 changes display semantics.

5. Update UI copy and layout.
   - Display selected frame in the controls or overlay.
   - Keep controls compact on narrow widths.
   - Avoid explanatory in-app prose beyond necessary labels.

6. Add smoke coverage.
   - Verify default frame value.
   - Select another frame.
   - Click refresh and assert the mocked API receives that frame.
   - Confirm the canvas remains nonblank.

### Planned Frontend Shape

```ts
export type PropagationFrameRequest = "native" | "TEME" | "EME2000" | "ITRF" | "QSW";

export type FrameOption = {
  value: PropagationFrameRequest;
  label: string;
};
```

### Edge Cases

- User changes frame while an Orekit request is in flight.
- User changes sampling settings after selecting a non-default frame.
- API rejects a selected frame because backend and frontend enums drift.
- Narrow viewport cannot fit a full segmented control.
- Existing stale Orekit data should not appear current after frame changes.

### Increment Completion Notes

- This increment may not render transformed traces correctly until Increment 4.
- The key deliverable is correct selected-frame request wiring and stale-state behavior.
- The UI should make the selected frame visible without turning the app into a settings dashboard.
- Implemented during Increment 3: added frontend frame settings, a compact frame selector, selected-frame request wiring, stale Orekit comparison clearing on frame changes, and smoke coverage for default and selected-frame refresh behavior.
- The selector defaults to `native`; changing the selector clears the Orekit trace, alignment, divergence metrics, and status until the user refreshes Orekit again.
- Non-`TEME` selected-frame responses currently follow the existing frame-mismatch path; selected-frame rendering semantics remain for Increment 4.

### Validation

- `CI=true pnpm --dir apps/web check`
- `CI=true pnpm --dir apps/web build`
- `CI=true pnpm --dir apps/web smoke`
- Manual browser check for selector layout at desktop and narrow widths.
- Verified during Increment 3 with `CI=true pnpm --dir apps/web check`, `CI=true pnpm --dir apps/web build`, and `CI=true pnpm --dir apps/web smoke`.

### Approval Question

Approve frontend selection behavior before rendering all frame-specific outputs.

## Increment 4: Selected-Frame Rendering and Metrics Coherence

### Objective

Render traces, marker position, overlay status, and divergence metrics from one coherent selected-frame sample set.

### Scope

- Convert returned samples in the selected frame to scene points.
- Ensure the Orekit trace and divergence readout identify the selected frame.
- Decide how to represent the local `satellite.js` trace when selected frame is not comparable.
- Keep the marker tied to the correct sample set for the selected display mode.
- Clear or disable divergence when local and Orekit samples are not in the same frame.
- Add visual cues for Earth-fixed and local-frame views if needed.

### Expected Files

- `apps/web/src/main.ts`
- `apps/web/src/scene/orbitTrace.ts`
- `apps/web/src/scene/createScene.ts`
- `apps/web/src/ui/orekitOverlayControls.ts`
- Possible module: `apps/web/src/scene/frameAxes.ts`
- `apps/web/tests/orbit-scene.smoke.spec.ts`

### Acceptance Criteria

- Each approved frame mode produces coherent trace and marker placement.
- Switching frames does not leak old geometry, old status, or stale metrics.
- Divergence metrics only appear when both compared sample sets are in the same frame and compatible units.
- The selected frame is visible in the overlay/readout.
- Local orbital frame display follows the documented convention from Increment 1.

### Implementation Plan

1. Define render ownership per frame.
   - For `native`/`TEME`, preserve existing local marker and dual-trace comparison behavior.
   - For explicit transformed frames, decide whether Orekit becomes the display source for marker and trace.
   - For non-comparable frames, hide or disable divergence metrics rather than comparing mismatched samples.

2. Adapt sample conversion.
   - Ensure scene point conversion continues to apply kilometer-to-scene-unit scaling at the scene boundary.
   - Keep transformed Orekit samples in kilometers.
   - Avoid mixing local `TEME` samples into `EME2000`, `ITRF`, or `QSW` rendering unless transformed.

3. Update marker behavior.
   - Use the selected-frame sample sequence for marker animation where appropriate.
   - Reset marker animation when the displayed frame sample set changes.
   - Keep no-data states nonblank and understandable.

4. Update divergence behavior.
   - Compute divergence only when local and remote comparable samples have matching frame and units.
   - Clear divergence when selected-frame rendering cannot produce a valid comparison.
   - Make the overlay frame label match the data actually being read.

5. Add optional frame visuals.
   - For `ITRF`, decide whether Earth rotation should pause or simply show Earth-fixed trace behavior.
   - For `QSW`, add axes or a local-frame visual only if it follows `FRAMES.md` and stays visually clear.

6. Extend smoke tests.
   - Mock selected-frame API responses.
   - Verify trace/status/readout update for at least one transformed frame.
   - Verify stale metrics clear when switching frames.

### Rendering Policy Candidates

- `native`/`TEME`: show local `satellite.js` trace, Orekit trace, local marker, and divergence.
- `EME2000`: show Orekit selected-frame trace and marker; hide divergence unless local samples are transformed too.
- `ITRF`: show Orekit Earth-fixed trace and marker; hide divergence unless local samples are transformed too.
- `QSW`: show local-frame view according to `FRAMES.md`; likely not a normal geocentric orbit trace.

Increment 4 should implement the policy approved after Increments 1-3, not invent a different display model.

### Edge Cases

- Current animation frame index may exceed the selected-frame sample count.
- Selected-frame samples may be empty after an API error.
- Switching frame during animation should not leave marker position from a previous frame.
- Frame label in response may differ from requested frame for `native`.
- Local orbital coordinates may be visually tiny or degenerate compared with geocentric scene scale.

### Increment Completion Notes

- This increment should prioritize analytic correctness over always showing two traces.
- If a frame is display-only in Goal 04, document that in status/readout and the completion record.
- Keep Three.js scene APIs source-agnostic enough for Goal 05 data scenarios.

### Validation

- `CI=true pnpm --dir apps/web check`
- `CI=true pnpm --dir apps/web build`
- `CI=true pnpm --dir apps/web smoke`
- Manual browser verification for all frame modes at desktop and narrow widths.

### Approval Question

Approve render behavior before adding final numerical checks and docs.

## Increment 5: Transform Checks and Completion Record

### Objective

Add confidence checks and document remaining frame limitations for Goal 05.

### Scope

- Add numerical spot checks against Orekit outputs for known epochs and supported frames.
- Add backend tests for frame request validation and metadata.
- Add frontend fixture or smoke coverage for frame selector request wiring and stale-state behavior.
- Document frame assumptions, local-frame convention, known mismatch risks, and commands run.
- Create a completion record and update goal index status only after validation.

### Expected Files

- Tests under `tests/`
- Possible fixtures under `apps/web/src`
- `docs/goals/04-frame-controls/README.md`
- New file: `docs/goals/04-frame-controls/RECORD.md`
- Possible update: `docs/goals/05-data-loader-path/README.md`
- `docs/goals/README.md`

### Acceptance Criteria

- Transform behavior has repeatable numerical checks where practical.
- Goal 05 can depend on stable frame naming in scenario data.
- The record captures which frames are supported, which are display-only or comparison-safe, and which risks remain.
- The docs state when `TEME`, `EME2000`, `ITRF`, and the selected local frame should be used.

### Implementation Plan

1. Strengthen backend checks.
   - Add tests for frame metadata on all supported request values.
   - Add numerical invariants for transformed frames, such as finite vectors and expected magnitude preservation where valid.
   - Add skip-friendly data-enabled checks when Orekit data is unavailable.

2. Strengthen frontend checks.
   - Add fixture checks if pure frame-state helpers exist.
   - Extend Playwright smoke to cover selector request wiring and stale-state clearing.
   - Verify canvas nonblank after selected-frame refreshes.

3. Perform manual visual QA.
   - Run API and web app together with `OREKIT_DATA_PATH`.
   - Check default/native frame.
   - Check explicit inertial frame.
   - Check Earth-fixed frame.
   - Check local orbital frame behavior.
   - Check desktop and narrow viewport layouts.

4. Update docs.
   - Mark Goal 04 README complete.
   - Add `docs/goals/04-frame-controls/RECORD.md`.
   - Link the record from the Goal 04 README.
   - Update `docs/goals/README.md` only after validation passes.
   - Add Goal 05 handoff notes for scenario frame metadata.

5. Record limitations.
   - State which frames support divergence.
   - State which frames are Orekit-only display modes.
   - State known data/runtime dependencies.
   - State remaining local orbital limitations.

### Final Documentation Checklist

- `README.md` for Goal 04 marks the goal complete and links to `RECORD.md`.
- `FRAMES.md` lists supported frame values, labels, conventions, and caveats.
- `RECORD.md` lists completed increments, commands run, manual browser checks, and known risks.
- `docs/goals/README.md` marks Goal 04 complete only after implementation and validation.
- Goal 05 README or plan notes mention the stable frame names scenario data can use.

### Final Validation Matrix

- API frame request: `native`.
- API frame request: explicit inertial frame.
- API frame request: Earth-fixed frame.
- API frame request: local orbital frame.
- API rejected unsupported frame.
- Browser default frame load.
- Browser frame change before Orekit refresh.
- Browser Orekit refresh after frame change.
- Browser sampling settings changed after frame data is loaded.
- Browser API offline after selecting a non-default frame.
- Desktop viewport.
- Narrow viewport.

### Edge Cases

- Orekit data unavailable during manual QA.
- Playwright server port already occupied by a manual dev server.
- Frame transforms pass backend tests but look visually confusing due to camera framing.
- Goal 05 may need scenario metadata not exposed by Goal 04 if the record is incomplete.

### Increment Completion Notes

- This increment closes Goal 04 only after validation and docs agree with implemented behavior.
- Do not mark Goal 04 complete if any approved frame mode is only partially wired without documentation.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- `CI=true pnpm --dir apps/web check`
- `CI=true pnpm --dir apps/web build`
- `CI=true pnpm --dir apps/web smoke`
- Manual browser smoke test for all supported frame modes with the API running.

### Approval Question

Approve completion before moving to data loaders.

## Open Decisions

- Whether the initial selected frame should be `native`, explicit `TEME`, or `EME2000`.
- Whether transformed comparison should include browser-side `satellite.js` samples or use Orekit-only selected-frame display until a matching local transform exists.
- Whether `QSW` returns coordinates relative to the spacecraft origin, an axes overlay, or both.
- Whether Earth-fixed mode should pause Earth rotation, change camera framing, or only transform samples.
- Whether transformed sample responses need both `frame` and `source_frame` metadata in every sample or only at response level.

## Not In Scope

- New source formats.
- Scenario library UI.
- Higher-order force models.
- Maneuver or event visualization.
- Time animation redesign.
