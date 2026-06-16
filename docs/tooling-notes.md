# Tooling Notes

## Why Orekit + satellite.js + Three.js

Orekit is the serious dynamics engine: frames, time scales, force models, event detectors,
measurements, OD-adjacent workflows, and CCSDS support. The JPype wrapper is currently the
cleanest pip-installable path for a uv project, with the caveat that the JVM is process-global
and cannot be restarted inside one Python process.

`satellite.js` is useful because it runs directly in the browser, understands TLEs, and gives
instant feedback while a user scrubs time or selects objects. Treat it as a visualization and
comparison tool unless SGP4/TLE propagation is the product requirement.

Three.js is the right rendering layer when you want custom controls, custom overlays, and a scene
graph that is not tied to Cesium's globe-first worldview.

## Alternatives Worth Trying

- Poliastro or custom Astropy pipelines for notebook-style two-body and patched-conic analysis.
- Skyfield for approachable TLE/ephemeris work in Python.
- Basilisk when simulation fidelity and spacecraft dynamics become the center of gravity.
- CZML/Cesium only as an export target, not as the primary UI.

## Dependency Management

Use uv for all Python resolution and locking. Keep one `.venv` at the repo root unless Python and
service boundaries split enough to justify multiple packages.

Use pnpm for JavaScript because it is deterministic, workspace-friendly, and avoids repeatedly
copying large dependency trees. Keep frontend dependencies in `apps/web/package.json`; keep only
workspace scripts and package-manager pinning at the root.
