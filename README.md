# Orb Lab

Clean-room playground for orbit propagation and custom visualization.

## Recommended Stack

- Python: `3.14`, managed by `uv`. Python 3.14 is in bugfix support as of June 2026, and `orekit-jpype` advertises Python 3.14 support.
- Propagation: start with `orekit-jpype` for higher-fidelity work. Use `satellite.js` for browser-side TLE previews and interaction latency, not as the authoritative dynamics engine.
- Visualization: `three` with Vite and TypeScript. Keep scene state in TypeScript and exchange sampled state vectors with the Python service as JSON.
- JavaScript package manager: `pnpm` via Corepack. Pin the package manager in `package.json`; use `pnpm-lock.yaml` for deterministic installs.

This repo keeps uv’s cache local so sandboxed or reproducible runs do not depend on `~/.cache/uv`:

```sh
export UV_CACHE_DIR="$PWD/.uv-cache"
export UV_PYTHON_INSTALL_DIR="$PWD/.uv-python"
uv python install cpython-3.14.5-macos-aarch64-none
uv venv --python 3.14
uv sync --extra dev
```

Orekit TLE propagation needs Orekit data for UTC/leap-second history. Keep the data local and point the API at it:

```sh
export OREKIT_DATA_PATH="$PWD/orekit-data.zip"
uv run orb-api
```

For JavaScript dependencies, install or expose a normal Node distribution with Corepack, then:

```sh
corepack enable
corepack prepare pnpm@11.7.0 --activate
pnpm install
pnpm --dir apps/web dev
```

The Codex app’s bundled `node` is available here, but it does not expose `npm` or `corepack` on `PATH`, so JS dependency installation needs a normal Node toolchain.

## Architecture

```text
apps/web/        Three.js + satellite.js visualization client
src/orb_lab/     Python package for APIs and propagation adapters
docs/            Research notes and trade studies
```

Suggested boundary:

- `orekit-jpype`: authoritative propagation, frames, time scales, maneuver modeling, event detection.
- `satellite.js`: immediate TLE rendering, browser previews, quick comparisons against SGP4.
- `three`: rendering primitives, camera controls, picking, timelines, and custom scene layers.

## First Experiments

1. Propagate an ISS TLE in `satellite.js` and render ECI points in Three.js.
2. Add a Python endpoint that returns sampled Orekit PV coordinates for the same time range.
3. Overlay both traces and visualize divergence.
4. Add frame controls: ECI, ECEF, local orbital frame.
5. Add a data-loader path for OEM/CCSDS, TLE, and hand-authored initial states.

## Useful References Checked

- Python version lifecycle: https://devguide.python.org/versions/
- Node release schedule: https://raw.githubusercontent.com/nodejs/Release/main/schedule.json
- Orekit JPype package: https://pypi.org/project/orekit-jpype/
- pnpm package metadata: https://registry.npmjs.org/pnpm/latest
