# Goal 01: Satellite TLE + Three.js

## Objective

Propagate an ISS TLE in `satellite.js` and render sampled ECI points in the Three.js scene.

## Why First

This creates the minimum useful visualization loop: TLE input, browser-side propagation, orbit samples, and a visible object moving through a 3D scene.

## Acceptance Criteria

- The web app renders Earth, an orbit trace, and a satellite marker from sampled `satellite.js` ECI coordinates.
- The TLE source is explicit and easy to replace during experiments.
- The sampled trace is stable across reloads for a fixed epoch.
- The scene has enough camera framing and scale consistency to support later overlays.
- The implementation includes a lightweight validation path for TypeScript build or type checking.

## Proposed Increments

1. Extract TLE propagation into a dedicated TypeScript module with typed sample output.
2. Add a simple scene composition layer for Earth, trace geometry, and satellite marker.
3. Add deterministic epoch handling and basic sample controls.
4. Add frontend validation notes and smoke-test instructions.

See [PLAN.md](PLAN.md) for approval-sized implementation increments.

## Design Notes

- Treat `satellite.js` output as a visualization path, not the authoritative dynamics model.
- Use kilometers as the internal scene unit unless a later goal proves another scale is cleaner.
- Keep the scene logic small enough that frame transforms and overlays can be introduced without a rewrite.

## Dependencies

- Node 24 LTS.
- Corepack-managed `pnpm`.
- `three`, `satellite.js`, Vite, and TypeScript installed in `apps/web`.

## Risks

- Coordinate naming can drift between ECI/TEME assumptions if not documented carefully.
- Camera and unit scaling choices can make later divergence overlays visually misleading.

## Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- Manual browser smoke test of orbit trace and marker animation.
