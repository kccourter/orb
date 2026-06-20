# Increment 5 Plan: Fixed-Observer Orbital Situation View

## Objective

Turn the orbital display into a fixed-observer situation view: an inertial
camera watches Earth rotate underneath orbit traces and satellite markers.

The view should answer “what shells and actors are in the scene over this
preview window?” It should not be a quantitative uncertainty display.

## Current Ambiguity

The existing `Duration` and `Step` controls are local browser TLE preview
sampling controls:

- `Duration` is the length of the orbit preview window.
- `Step` is the sample interval used to draw the trace and animate the marker.
- They do not control the day-3 uncertainty horizon.
- They do not request high-fidelity ephemeris products.

Increment 5 should make that meaning visible in UI labels and docs.

## Recommended Direction

Keep the global orbital view geocentric and camera-fixed:

- Camera is stationary in scene/inertial coordinates unless the user changes it
  with later camera controls.
- Earth rotates visually under the orbit traces.
- Satellite markers advance along propagated samples.
- Orbit traces stay in the selected display frame and do not rotate with Earth
  unless the selected frame explicitly represents Earth-fixed behavior.
- No uncertainty ellipsoids or covariance controls are present.

This creates a stable observer viewpoint for situational awareness without
pretending that all frame effects are physically complete in the browser.

## Scene Behavior

### Camera

Use a named camera preset rather than ad hoc defaults:

- `fixed_inertial_observer`
- initial position: oblique view with Earth and the orbit shell framed;
- camera target: Earth center;
- no automatic camera orbiting.

Increment 5 may keep the camera static without adding user orbit controls. A
later increment can add orbit-pan/free rotation if needed.

### Earth

Continue rotating Earth for visual context:

- Earth rotation is decorative/situational in the browser scene.
- The rotation should be documented as a visual cue, not an authoritative ITRF
  transform.
- Add a subtle surface reference if practical, such as a meridian/equator grid
  or terminator-neutral shading, so rotation is visible.

### Orbit Traces And Satellite Markers

Keep trace/marker behavior simple:

- local browser preview remains `satellite.js` `TEME`;
- Orekit `native`/`TEME` remains comparison-safe;
- `EME2000`, `ITRF`, and `QSW` remain Orekit display modes per Goal 04;
- QSW must not be presented as a geocentric shell.

If an Orekit display frame is not comparable with the local trace, continue to
clear the local trace and show Orekit-only display behavior.

## UI Changes

Rename or relabel the first control group from generic sampling language to
orbit-preview language:

- `Duration` -> `Preview`
- `Step` -> `Sample`
- Optional accessible label: `Orbit preview controls`

The UI should stay compact. Avoid adding explanatory paragraphs inside the app.
Use concise labels and tooltips/title text if needed.

Suggested labels:

- `Epoch`
- `Preview`
- `Sample`
- `Reset`

Suggested status/documentation wording:

- `Preview` controls trace length.
- `Sample` controls trace density and animation cadence.

## Test And Browser Checks

Smoke tests should verify:

- orbit scene renders nonblank;
- preview/sample controls still recompute the trace;
- frame and Orekit controls still behave as before;
- no uncertainty controls appear in the orbital view.

Manual/browser checks should verify:

- desktop viewport frames Earth and orbit shell well;
- narrow viewport controls do not overlap;
- Earth rotation is visible over time;
- satellite marker advances along the trace.

## Expected Files

- `apps/web/src/scene/createScene.ts`
- `apps/web/src/ui/controls.ts`
- `apps/web/src/styles.css`
- `apps/web/tests/orbit-scene.smoke.spec.ts`
- Possible scene helper: `apps/web/src/scene/cameraPresets.ts`
- Goal docs and record updates.

## Acceptance Criteria

- The scene reads as a fixed-observer orbital situation view.
- Earth rotation is visible and distinct from satellite marker motion.
- Orbit preview controls clearly communicate preview window and sample interval.
- Frame behavior remains consistent with Goal 04 frame policy.
- No uncertainty controls or ellipsoids are present in the orbital view.
- Desktop and narrow viewport layouts remain usable.

## Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`
- Browser checks at desktop and narrow viewport sizes.

## Not In Scope

- Local QSW uncertainty explorer.
- User-driven camera orbit/pan controls, unless needed to make the fixed preset
  usable.
- Multi-actor catalog management.
- Authoritative Earth-fixed browser transforms.
- Higher-fidelity ephemeris products.

## Approval Question

Approve this fixed-observer orbit-view plan before implementation.
