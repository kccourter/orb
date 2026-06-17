# Goal 01: Satellite TLE + Three.js

## Objective

Propagate an ISS TLE in `satellite.js` and render sampled TEME-position points in the Three.js scene.

## Why First

This creates the minimum useful visualization loop: TLE input, browser-side propagation, orbit samples, and a visible object moving through a 3D scene.

## Acceptance Criteria

- The web app renders Earth, an orbit trace, and a satellite marker from sampled `satellite.js` TEME coordinates.
- The TLE source is explicit and easy to replace during experiments.
- The sampled trace is stable across reloads for a fixed epoch.
- The scene has enough camera framing and scale consistency to support later overlays.
- The implementation includes TypeScript, production build, and Playwright smoke-test validation.

## Completed Increments

1. Extract TLE propagation into a dedicated TypeScript module with typed sample output.
2. Add a simple scene composition layer for Earth, trace geometry, and satellite marker.
3. Add deterministic epoch handling and basic sample controls.
4. Add frontend validation notes and smoke-test instructions.

See [PLAN.md](PLAN.md) for the approved increment plan and [RECORD.md](RECORD.md) for the completion record.

## Design Notes

- Treat `satellite.js` output as a visualization path, not the authoritative dynamics model.
- Sample outputs from `satellite.js` are labeled `TEME` and stored as kilometers plus kilometers per second.
- The scene display scale is 1 Three.js unit per 1,000 kilometers; Earth renders with radius `6.371` scene units.
- The default sampling settings are deterministic: epoch `2024-06-21T13:31:24Z`, duration `92.5` minutes, and step `30` seconds.
- Keep the scene logic small enough that frame transforms and overlays can be introduced without a rewrite.
- Sampling controls are plain DOM controls for epoch, duration, step size, and reset.

## Dependencies

- Node 24 LTS.
- Corepack-managed `pnpm`.
- `three`, `satellite.js`, Vite, and TypeScript installed in `apps/web`.

## Risks

- Coordinate naming can drift if later goals treat `satellite.js` TEME positions as another frame without an explicit transform.
- Camera and unit scaling choices can make later divergence overlays visually misleading.

## Validation

- `CI=true pnpm --dir apps/web check`
- `CI=true pnpm --dir apps/web build`
- `CI=true pnpm --dir apps/web smoke`
