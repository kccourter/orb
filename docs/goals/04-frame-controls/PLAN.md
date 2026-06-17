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

### Validation

- Documentation review.
- No runtime validation required for this planning increment.

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

### Validation

- `uv run pytest`
- `uv run ruff check .`
- Manual API request for each supported frame when `OREKIT_DATA_PATH` is available.

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

### Validation

- `CI=true pnpm --dir apps/web check`
- `CI=true pnpm --dir apps/web build`
- `CI=true pnpm --dir apps/web smoke`
- Manual browser check for selector layout at desktop and narrow widths.

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
