# Increment 6 Plan: Local QSW Uncertainty Explorer

## Objective

Create a local QSW uncertainty explorer that makes the ORB-SAT-1 synthetic
covariance ellipsoid inspectable without restoring uncertainty overlays to the
global orbital situation view.

Status: implemented.

## Implemented Direction

The implementation adds a separate in-app `QSW` mode beside the existing
`Orbit` view:

- the global orbit view remains the Earth-scale situational-awareness scene;
- the local QSW view uses its own Three.js canvas, camera, controls, and
  geometry lifecycle;
- the spacecraft remains centered at the local origin;
- Q, S, and W axes are labeled directly in the local scene;
- the selected covariance ellipsoid is rendered from the ORB-SAT-1 synthetic
  QSW fixture;
- `1σ`, `2σ`, and `3σ` selections update the ellipsoid and numeric readouts;
- the offset scrubber supports fine-grained movement from epoch through `+72h`;
- covariance is linearly interpolated between neighboring fixture samples for
  smooth inspection and labeled as interpolated in the readout;
- playback animates the offset with `1x`, `5x`, `10x`, `15x`, `30x`, and `60x`
  speed options;
- view buttons provide `Iso`, `+Q`, `+S`, and `+W` camera presets.

## Frame And Data Semantics

The first local explorer assumes the source covariance is already in QSW:

- `Q`: radial direction.
- `S`: along-track direction.
- `W`: cross-track angular momentum direction.

The current fixture is diagonal in QSW, so the displayed Q/S/W axis-length
readouts are direct standard deviations scaled by the selected sigma level.
The reusable symmetric covariance eigensystem remains available for later
non-diagonal covariance.

The local mesh uses a local-only display gain so meter-to-kilometer uncertainty
stays readable. Numeric readouts remain in physical meters or kilometers.

## UI

The app has a fixed mode switch:

- `Orbit`: global fixed-observer orbital situation view.
- `QSW`: local covariance explorer.

The local controls include:

- offset scrubber over the covariance fixture samples;
- play/pause and speed controls;
- sigma selector;
- local camera presets;
- readouts for UTC epoch, offset, Q/S/W axis lengths, frame/unit label, and
  provenance.

The implementation intentionally does not add explanatory prose to the app.
Labels and readouts are compact operational UI.

## Not In Scope

- API-served covariance products.
- Imported OEM/CDM covariance.
- Conversion from Cartesian covariance frames into QSW.
- Intersection probability readouts.
- Uncertainty ellipsoid overlays in the global orbital view.

## Validation

Expected validation:

```sh
pnpm --dir apps/web check
pnpm --dir apps/web build
pnpm --dir apps/web smoke
```

Manual browser checks should cover desktop and narrow viewports for:

- nonblank global orbit scene;
- nonblank local QSW scene;
- readable Q/S/W axes;
- readable local controls and readouts;
- sigma, offset, and view controls updating the local explorer;
- no uncertainty overlay restored to the global orbit view.
