# Frame Controls Increment Plan

## Goal

Add controls for inspecting trajectories in ECI, ECEF, and a local orbital frame without obscuring the propagation source or comparison semantics.

Each increment should be approved before implementation. This goal is intentionally careful because frame mistakes can make a polished visualization analytically wrong.

## Increment 1: Frame Definitions and Naming Policy

### Objective

Decide and document the exact frame names, transform sources, and local orbital convention.

### Scope

- Define what the UI calls ECI and how that maps to Orekit and `satellite.js` outputs.
- Decide ECEF frame naming.
- Choose the first local orbital frame convention, such as QSW, TNW, or LVLH.
- Record which transforms happen in Python versus TypeScript.

### Expected Files

- `docs/goals/04-frame-controls/README.md`
- Possible new file: `docs/goals/04-frame-controls/FRAMES.md`
- Possible update: `docs/goals/02-orekit-pv-endpoint/README.md`

### Acceptance Criteria

- Frame names are unambiguous across API payloads and UI labels.
- Local orbital frame axes are defined in words and math notation.
- Transform ownership is decided before code changes.

### Validation

- Documentation review.
- No runtime validation required for this planning increment.

### Approval Question

Approve frame definitions before implementation.

## Increment 2: Frame-Aware API Strategy

### Objective

Expose or request samples in the selected frame without making the browser responsible for authoritative orbital transforms.

### Scope

- Extend propagation request/response models if needed to include requested frame.
- Add API behavior for ECI/ECEF/local frame output or separate transform endpoint.
- Preserve original/source frame metadata.
- Add tests for frame request validation.

### Expected Files

- `src/orb_lab/models.py`
- `src/orb_lab/api.py`
- Possible module: `src/orb_lab/frames.py`
- Tests under `tests/`

### Acceptance Criteria

- Unsupported frame names fail with useful validation errors.
- Responses clearly identify requested frame and source frame.
- Existing Goal 02 clients remain compatible or receive a documented migration.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- Manual API request for each supported frame.

### Approval Question

Approve API changes before frontend state and controls.

## Increment 3: Frontend Frame Selection State

### Objective

Add a compact frame selector and wire it to sample requests/rendering state.

### Scope

- Add a segmented or select-style frame control.
- Store selected frame separately from propagation source and sampling settings.
- Trigger data refresh or transform update when frame changes.
- Keep scene usable while new frame data is loading.

### Expected Files

- `apps/web/src/ui/frameControls.ts`
- `apps/web/src/main.ts`
- Possible state module under `apps/web/src/state/`

### Acceptance Criteria

- Users can select ECI, ECEF, and the chosen local frame.
- Frame changes do not reset unrelated sampling settings unexpectedly.
- Offline/API error behavior remains graceful.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- Manual browser smoke test.

### Approval Question

Approve the UI behavior before implementing all transform render paths.

## Increment 4: Render Frame-Specific Traces

### Objective

Update the scene consistently when selected frame data changes.

### Scope

- Ensure trace geometry, marker position, and divergence readout all use the same selected-frame sample set.
- Add visual cues that the selected frame changed.
- Keep camera framing sensible for ECI and ECEF.
- Decide whether local orbital frame is rendered as trajectory-relative axes, transformed trace, or both.

### Expected Files

- `apps/web/src/scene/orbitTrace.ts`
- `apps/web/src/scene/createScene.ts`
- `apps/web/src/main.ts`
- Possible module: `apps/web/src/scene/frameAxes.ts`

### Acceptance Criteria

- Each supported frame mode produces coherent trace and marker placement.
- Switching frames does not leak old geometry or stale metrics.
- Local orbital frame display follows the documented convention.

### Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- Manual browser verification for all frame modes.

### Approval Question

Approve render behavior before adding numerical checks.

## Increment 5: Transform Checks and Completion Record

### Objective

Add confidence checks and document remaining frame limitations.

### Scope

- Add numerical spot checks against Orekit outputs for known epochs.
- Add tests for frame request validation and any local transform helpers.
- Document frame assumptions and any known mismatch with `satellite.js`.
- Record commands and browser checks run.

### Expected Files

- Tests under `tests/` and possibly `apps/web/src`
- `docs/goals/04-frame-controls/README.md`
- Possible new file: `docs/goals/04-frame-controls/RECORD.md`

### Acceptance Criteria

- Transform behavior has repeatable numerical checks where practical.
- Goal 05 can depend on stable frame naming in scenario data.

### Validation

- `uv run pytest`
- `uv run ruff check .`
- `pnpm --dir apps/web check`
- Browser smoke test for all frame modes.

### Approval Question

Approve completion before moving to data loaders.

## Open Decisions

- Exact ECI naming: `TEME`, `EME2000`, or UI-friendly `ECI` mapped to a specific frame.
- ECEF frame choice and Earth orientation data requirements.
- Local orbital frame convention.
- Whether local frame view is a camera mode, coordinate transform, axes overlay, or all three.

## Not In Scope

- New source formats.
- Scenario library UI.
- Higher-order force models.
- Time animation redesign.
