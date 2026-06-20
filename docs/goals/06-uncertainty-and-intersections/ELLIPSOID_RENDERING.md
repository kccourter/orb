# Increment 3 Plan: Ellipsoid Rendering From Epoch Through Day 3

## Objective

Render ORB-SAT-1 uncertainty ellipsoids in the Three.js scene using the
Increment 2 synthetic QSW covariance fixture, from epoch through day 3.

This increment makes uncertainty visible and controllable without changing
propagation authority or claiming that the synthetic fixture is a real orbit
determination product.

## Recommended Direction

The implemented direction is a frontend-only uncertainty overlay for the
existing scene:

- Import a TypeScript representation of the ORB-SAT-1 synthetic covariance
  samples.
- Convert each `position_3x3` covariance sample into an ellipsoid mesh.
- Anchor ellipsoid centers to the currently displayed nominal orbit by matching
  covariance sample epochs to nearest propagated samples.
- Scale ellipsoid axes by selected sigma level.
- Render translucent ellipsoids in a distinct color while keeping the nominal
  orbit trace, Earth, and satellite marker readable.
- Add compact controls for visibility, sigma level, and sample density.

The first implementation uses the local browser TLE path as the nominal
trace. Later increments can reuse the same overlay with Orekit/OEM samples.

## Data Flow

1. Keep the canonical JSON fixture in
   `docs/goals/06-uncertainty-and-intersections/fixtures/orb-sat-1.synthetic-covariance.json`.
2. Added a frontend fixture module under `apps/web/src/uncertainty/` containing
   the same day-3 covariance values as typed data.
3. Add TypeScript types for covariance series, frame metadata, units, samples,
   and provenance.
4. Add fixture checks that assert:
   - object id is `orb-sat-1`;
   - frame is `QSW`;
   - covariance type is `position_3x3`;
   - samples are ordered from epoch through 72 hours;
   - matrices are diagonal and nonnegative for the first fixture.

This duplicates the goal-local fixture into app code for now because Vite only
includes files under `apps/web/src` without extra asset handling. A later loader
path can remove the duplication by serving scenario fixtures from the API.

## Ellipsoid Geometry

### Axis Extraction

For each 3x3 covariance matrix:

- Compute eigenvalues and eigenvectors.
- Clamp tiny negative eigenvalues caused by floating-point noise to zero.
- Axis radius in kilometers is `sqrt(eigenvalue) * sigma`.
- Convert kilometers to Three.js scene units using the existing
  `SCENE_KILOMETERS_PER_UNIT` boundary.

The synthetic fixture is diagonal in QSW, but the implementation should support
general symmetric covariance so imported or rotated covariance can be rendered
later.

### Orientation

For Increment 3, use the covariance eigenvectors as local ellipsoid axes.

Important limitation: QSW axes are local orbital-frame axes, while the current
browser scene points are rendered in the satellite.js output frame. A fully
correct QSW-to-scene orientation requires nominal position/velocity frame
construction at each sample. The first rendering should therefore be explicit:

- Center placement is tied to the nominal trace by epoch.
- Axis lengths are meaningful.
- Orientation is approximate unless a local QSW basis is computed from the
  nominal state.

Preferred implementation: compute a QSW basis from the nearest nominal
position/velocity sample and orient the ellipsoid into scene coordinates:

- `Q`: radial unit vector from position.
- `W`: orbital angular momentum unit vector from `position x velocity`.
- `S`: completes the right-handed frame, typically `W x Q`.

If the nearest sample lacks usable velocity or the basis degenerates, fall back
to axis-aligned orientation and mark the control/readout as approximate.

### Visual Scaling

Real 1-sigma meter-level uncertainty is tiny against a full Earth-scale orbit.
Use a separate visual gain so the ellipsoids are inspectable:

- `sigma`: user selectable `1`, `2`, `3`.
- `visual_gain`: fixed default such as `25x` for the first view, clearly labeled
  as display scaling.
- Minimum visible radius: optional small floor in scene units so epoch ellipsoid
  is not invisible.

The underlying data should stay in real `km^2`; only rendering uses visual gain.

## Controls

Add a compact uncertainty overlay below the existing Orekit overlay:

- Toggle: show/hide uncertainty.
- Segmented control or select: `1σ`, `2σ`, `3σ`.
- Sample density: all samples, daily, or current-only.
- Readout: `ORB-SAT-1 synthetic QSW`, selected sigma, visible sample count.

Suggested test ids:

- `uncertainty-toggle`
- `uncertainty-sigma`
- `uncertainty-density`
- `uncertainty-status`

The control should stay operational and compact. Avoid explanatory prose in the
app; the provenance label can be concise.

## Scene API

Extend `OrbitScene` with:

- `setUncertaintyEllipsoids(ellipsoids)`
- `clearUncertaintyEllipsoids()`

Create a dedicated scene module:

- `apps/web/src/scene/uncertainty.ts`

Suggested responsibilities:

- Build ellipsoid meshes from covariance samples and nominal samples.
- Keep material creation/disposal contained.
- Return a `THREE.Group` or list of meshes that `createScene.ts` owns and
  disposes.

## Expected Files

- `apps/web/src/uncertainty/types.ts`
- `apps/web/src/uncertainty/orbSat1SyntheticCovariance.ts`
- `apps/web/src/uncertainty/fixtureChecks.ts`
- `apps/web/src/scene/uncertainty.ts`
- `apps/web/src/scene/createScene.ts`
- `apps/web/src/main.ts`
- `apps/web/src/ui/uncertaintyControls.ts`
- `apps/web/src/styles.css`
- `apps/web/tests/orbit-scene.smoke.spec.ts`
- Goal docs and record updates.

## Acceptance Criteria

- Uncertainty ellipsoids render from epoch through 72 hours when enabled.
- The overlay can switch between `1σ`, `2σ`, and `3σ`.
- The overlay can reduce visible samples without recomputing the nominal trace.
- The UI labels the layer as synthetic QSW uncertainty.
- The nominal trace, Earth, satellite marker, and existing controls remain
  readable.
- Ellipsoid geometry is disposed when refreshed or when the app unloads.
- Desktop and narrow viewport smoke checks show a nonblank, usable scene.

## Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`
- Manual or browser-tool checks at:
  - desktop viewport, around `1280x800`;
  - narrow viewport, around `390x844`.
- Canvas-pixel check confirming nonblank rendering after uncertainty is toggled
  on.

## Open Decisions For Approval

- Use a frontend fixture copy under `apps/web/src/uncertainty/` for Increment 3.
- Compute QSW orientation from local nominal position/velocity where possible.
- Use a visual gain so meter-to-kilometer uncertainty remains inspectable.
- Add one compact uncertainty control strip below existing overlays.
- Keep the app text concise: synthetic provenance, frame, sigma, and visible
  count.

## Not In Scope

- API serving of covariance fixtures.
- Real-time covariance propagation.
- Imported OEM/CDM covariance.
- Intersection probability readouts.
- Replacing ISS/TLE propagation with ORB-SAT-1 runtime propagation.
