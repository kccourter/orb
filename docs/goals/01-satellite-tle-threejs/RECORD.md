# Goal 01 Completion Record

## Status

Completed on 2026-06-17.

Goal 01 now provides a deterministic browser visualization loop for an ISS TLE propagated with `satellite.js` and rendered with Three.js.

## Implemented Shape

- TLE propagation lives in `apps/web/src/orbits/tle.ts`.
- The bundled ISS fixture lives in `apps/web/src/orbits/fixtures.ts`.
- Scene construction lives in `apps/web/src/scene/createScene.ts`.
- Orbit trace conversion and geometry updates live in `apps/web/src/scene/orbitTrace.ts`.
- Deterministic sampling settings live in `apps/web/src/state/orbitSettings.ts`.
- Plain DOM sampling controls live in `apps/web/src/ui/controls.ts`.
- `apps/web/src/main.ts` orchestrates fixture sampling, scene updates, controls, resize, and animation.

## Frame And Units

- `satellite.js` propagated samples are labeled `TEME`.
- Sample positions are stored in kilometers.
- Sample velocities are stored in kilometers per second.
- Scene display scale is 1 Three.js unit per 1,000 kilometers.
- Earth renders with radius `6.371` scene units.
- Default sampling uses epoch `2024-06-21T13:31:24Z`, duration `92.5` minutes, and step `30` seconds.

## Validation

Ran on 2026-06-17:

- `CI=true pnpm --dir apps/web check` passed.
- `CI=true pnpm --dir apps/web build` passed.
- `CI=true pnpm --dir apps/web smoke` passed.

The Playwright smoke suite launches Chromium, starts the Vite app, verifies the WebGL canvas renders non-background pixels, verifies sampling controls render with deterministic defaults, changes duration, and confirms the canvas remains nonblank after recomputation and reset.

## Visual QA

The Codex in-app browser surface was not available in this session (`agent.browsers` returned an empty list). Playwright Chromium is the repeatable visual QA path for this goal.

## Known Warnings And Risks

- Vite emits browser-external warnings from `satellite.js` WASM helper exports during production build, but the build completes.
- Vite reports a chunk-size warning after minification; no code splitting was added in Goal 01.
- `satellite.js` output is a visualization path, not the authoritative dynamics model for later Orekit comparison work.
- Later overlay work must not treat the `TEME` frame label as an inertial frame conversion.
