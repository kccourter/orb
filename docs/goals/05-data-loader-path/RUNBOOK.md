# Goal 05 Verification Runbook

Use this runbook to verify the current status of Goal 05: Data Loader Path.

## 1. Confirm Branch And Worktree

```sh
git status --short --branch
```

Expected:

- Branch is `feat/05-data-loader-path`.
- Goal 05 completion docs may be modified if Increment 6 has not been committed
  yet.
- No unexpected code changes are required for Increment 6.

Useful follow-up:

```sh
git diff --stat
```

Expected Goal 05 completion diff:

- `docs/goals/05-data-loader-path/RECORD.md`
- `docs/goals/05-data-loader-path/README.md`
- `docs/goals/05-data-loader-path/PLAN.md`
- `docs/goals/README.md`
- This runbook, if not yet committed.

## 2. Confirm Goal Docs

Check completion state:

```sh
sed -n '1,40p' docs/goals/05-data-loader-path/README.md
sed -n '1,120p' docs/goals/05-data-loader-path/RECORD.md
sed -n '1,24p' docs/goals/README.md
```

Expected:

- Goal 05 README says completed on `2026-06-20` and links to `RECORD.md`.
- Goal 05 record lists implemented shape, API routes, examples, source behavior,
  validation, and deferred work.
- Top-level goals index marks Data Loader Path complete.

Check the plan tail:

```sh
sed -n '560,600p' docs/goals/05-data-loader-path/PLAN.md
```

Expected:

- Increment 6 has implementation and verification notes.
- Remaining choices are listed as deferred decisions, not open blockers.

## 3. Verify Backend

Run normal backend tests:

```sh
uv run pytest
```

Expected:

- Tests pass.
- OEM and data-dependent propagation tests may skip when `OREKIT_DATA_PATH` is
  not set.

Run lint:

```sh
uv run ruff check .
```

Expected:

- `All checks passed!`

Run data-enabled backend tests:

```sh
UV_CACHE_DIR=/Users/kcourter/dev/orb/.uv-cache \
OREKIT_DATA_PATH=/Users/kcourter/dev/orb/orekit-data.zip \
uv run pytest
```

Expected:

- Tests pass without OEM skips.
- Goal 05 record was last verified with `78 passed`.

## 4. Verify Frontend

Run TypeScript checks:

```sh
pnpm --dir apps/web check
```

Run production build:

```sh
pnpm --dir apps/web build
```

Expected:

- Build succeeds.
- Vite may still report known browser-external warnings from `satellite.js` and
  a chunk-size warning.

Run browser smoke tests:

```sh
CI=true pnpm --dir apps/web smoke
```

Expected:

- Smoke suite passes.
- Goal 05 record was last verified with `6 passed`.

## 5. Verify Scenario API Manually

Start the API with Orekit data:

```sh
UV_CACHE_DIR=/Users/kcourter/dev/orb/.uv-cache \
OREKIT_DATA_PATH=/Users/kcourter/dev/orb/orekit-data.zip \
uv run uvicorn orb_lab.api:app --host 127.0.0.1 --port 8000
```

In another terminal:

```sh
curl -sS http://127.0.0.1:8000/scenarios/examples
curl -sS http://127.0.0.1:8000/scenarios/examples/iss-tle
curl -sS http://127.0.0.1:8000/scenarios/examples/iss-oem
curl -sS http://127.0.0.1:8000/scenarios/examples/manual-initial-state
```

Expected:

- Example list contains `iss-tle`, `iss-oem`, and `manual-initial-state`.
- `iss-tle` returns a normalized scenario with source type `tle` and frame
  `TEME`.
- `iss-oem` returns source type `oem_ccsds`, frame `EME2000`, and samples.
- `manual-initial-state` returns source type `initial_state`, frame `EME2000`,
  an `initial_state`, and one sample.

Stop the API with `Ctrl-C` after checking.

## 6. Verify Browser Scenario Loading

Start the API as shown above, then start the web app:

```sh
pnpm --dir apps/web dev
```

Open:

```text
http://127.0.0.1:5173/
```

Manual checks:

- Scenario selector loads bundled examples.
- Loading `iss-tle` updates the active TLE preview and keeps Orekit refresh
  available.
- Loading `iss-oem` displays normalized sample data and leaves refresh in a
  no-TLE state.
- Loading `manual-initial-state` displays one normalized state sample.
- Scenario metadata shows source type and exact frame.
- The canvas remains nonblank at desktop and narrow widths.

Stop both servers with `Ctrl-C` after checking.

## 7. Current Completion Interpretation

Goal 05 is complete when:

- `docs/goals/05-data-loader-path/RECORD.md` exists and matches implemented
  behavior.
- Goal 05 README and top-level goal index mark the goal complete.
- Backend, data-enabled backend, frontend, and smoke validations pass.
- The known deferred work remains documented:
  - OEM parsing requires Orekit data.
  - OEM support is a narrow first subset.
  - OEM and initial-state paths are display-ready, not independently
    propagatable.
  - Browser paste/file import is deferred.
  - Arbitrary initial-state propagation belongs to a later dynamics goal.
