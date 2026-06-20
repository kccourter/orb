# Increment 4 Plan: Back Out Uncertainty From Orbital View

## Objective

Remove uncertainty rendering from the Earth-scale orbital view and preserve the
useful pieces for the later local QSW uncertainty explorer.

Increment 3 proved that the app can render covariance ellipsoids, but the global
orbit view is the wrong scale and frame for quantitative uncertainty. This
increment should make the orbital view clean again while keeping the experiment
available in the implementation record.

Status: implemented. The orbital view no longer renders uncertainty controls or
ellipsoid meshes.

## Recommended Direction

The orbital scene is treated as a situational-awareness surface only:

- no uncertainty ellipsoid meshes;
- no uncertainty controls in the orbital control stack;
- no covariance readout in the global scene;
- no tests that expect uncertainty controls in the orbital view.

Preserve reusable uncertainty assets for Increment 6:

- TypeScript covariance types;
- ORB-SAT-1 synthetic covariance fixture;
- fixture validation checks;
- generic ellipsoid math if it can be reused cleanly in the local explorer.

The likely best shape is to disconnect uncertainty from `main.ts` and
`createScene.ts`, but keep the `apps/web/src/uncertainty/` data layer. The
current `apps/web/src/scene/uncertainty.ts` can either remain as reusable
ellipsoid math or be moved/renamed during Increment 6 when the local explorer
has a clearer scene boundary.

## Removal Scope

### App Wiring

Remove from `apps/web/src/main.ts`:

- `createUncertaintyEllipsoidGroup` and `DEFAULT_UNCERTAINTY_OPTIONS` imports;
- `createUncertaintyControls` import and control stack append;
- `ORB_SAT_1_SYNTHETIC_COVARIANCE` runtime import;
- uncertainty state;
- `refreshUncertaintyLayer`;
- covariance epoch alignment helper if only used by orbital rendering;
- calls to `refreshUncertaintyLayer` from local, Orekit, and animation paths.

Keep `./uncertainty/fixtureChecks` only if we still want frontend fixture
validation at app startup. Prefer keeping it because the fixture remains an
approved Goal 06 asset.

### Scene API

Remove from `apps/web/src/scene/createScene.ts`:

- `setUncertaintyEllipsoids`;
- `clearUncertaintyEllipsoids`;
- uncertainty group scene ownership;
- uncertainty disposal from the orbital scene.

Do not delete generic ellipsoid-generation code until Increment 6 decides
whether to reuse it for the local explorer.

### UI

Remove from the orbital view:

- `apps/web/src/ui/uncertaintyControls.ts` usage;
- `.uncertainty-controls` CSS from the global control stack.

Possible file disposition:

- Delete `uncertaintyControls.ts` if no code uses it after the removal.
- Keep uncertainty types and fixtures.

### Tests

Update `apps/web/tests/orbit-scene.smoke.spec.ts`:

- Remove the test that expects `uncertainty-toggle`, `uncertainty-sigma`,
  `uncertainty-density`, and `uncertainty-status`.
- Add or adjust a smoke assertion that the orbital view does **not** render
  uncertainty controls.
- Keep existing nonblank canvas, sampling, frame, and Orekit overlay checks.

## Expected Files

- `apps/web/src/main.ts`
- `apps/web/src/scene/createScene.ts`
- `apps/web/src/styles.css`
- `apps/web/tests/orbit-scene.smoke.spec.ts`
- Possible deletion: `apps/web/src/ui/uncertaintyControls.ts`
- Possible retention: `apps/web/src/uncertainty/types.ts`
- Possible retention: `apps/web/src/uncertainty/orbSat1SyntheticCovariance.ts`
- Possible retention: `apps/web/src/uncertainty/fixtureChecks.ts`
- Possible retention or later move: `apps/web/src/scene/uncertainty.ts`
- Goal docs and record updates.

## Acceptance Criteria

- The orbital view has no uncertainty ellipsoid overlay.
- The orbital view has no uncertainty control strip.
- The global control stack contains only orbit sampling, frame, and Orekit
  overlay controls.
- The existing orbit trace, Earth, satellite marker, frame controls, and Orekit
  controls still work.
- Frontend covariance fixture data remains available for the later local
  uncertainty explorer.
- The Goal 06 record states that Increment 3 was intentionally backed out from
  the orbital view.

## Validation

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`
- If pnpm dependency-status checks try to reinstall dependencies in a non-TTY
  sandbox, use the direct local binaries after restoring deps:
  - `apps/web/node_modules/.bin/tsc --noEmit`
  - `apps/web/node_modules/.bin/vite build`
- Browser checks:
  - desktop viewport: no uncertainty controls and nonblank canvas;
  - narrow viewport: no overlapping controls and nonblank canvas.

## Not In Scope

- Fixed-observer orbital view redesign.
- Local QSW uncertainty explorer.
- New uncertainty time scrubber.
- External ephemeris products.
- Intersection probability.

## Approval Question

Approve this removal plan before implementing the orbital-view cleanup.
