# Agent Instructions

## Project Context

Orb Lab is a clean-room playground for orbit propagation and custom
visualization. Keep the split between quick browser previews and authoritative
propagation explicit:

- `satellite.js` is for browser-side TLE previews, interaction latency, and
  comparison against SGP4/TLE behavior.
- Python plus Orekit JPype is the intended path for higher-fidelity,
  authoritative propagation, frames, time scales, maneuvers, and event work.
- Three.js owns custom rendering, scene controls, picking, timelines, and
  overlays.

Use `README.md` and `docs/tooling-notes.md` as the canonical stack and tooling
references instead of duplicating detailed setup guidance here.

## Tech Stack

- Python `3.14`, managed by `uv`; project package lives under `src/orb_lab`.
- API service: FastAPI with an `orb-api` console script.
- Propagation: `orekit-jpype` for authoritative work, `satellite.js` for
  browser-side TLE previews.
- Frontend: TypeScript, Vite, Three.js, and Playwright under `apps/web`.
- JavaScript package manager: `pnpm@11.7.0` via Corepack; root scripts delegate
  to `apps/web`.

## Validation Commands

Run the checks that match the files touched. Common commands are:

- `uv run pytest`
- `uv run ruff check`
- `pnpm --dir apps/web check`
- `pnpm --dir apps/web build`
- `pnpm --dir apps/web smoke`

Use the `CI=true` environment form for frontend validation when browser smoke
tests need deterministic non-watch behavior.

## Frontend And Scene Conventions

- Keep `satellite.js` samples in kilometers and do scene-display scaling at the
  Three.js scene boundary.
- Label coordinate frames explicitly in sampled state data. Treat TEME/ECI/ECEF
  wording as a design choice that should be documented before downstream code
  depends on it.
- Prefer compact operational controls over dashboard or landing-page patterns.
- When changing the canvas scene, verify it is nonblank, framed correctly, and
  usable at desktop and narrow viewport sizes.

## Standard New-Branch Workflow

For new feature or integration branches, use this default flow before coding:

1. Define the branch goal.
2. Write or update the relevant plan under `docs/goals/...`.
3. Present the plan for user review and approval.
4. Implement only after approval.

Small investigative commands, repository inspection, and validation checks are
fine before approval, but avoid landing code changes on a new branch until the
goal and plan are agreed.

Each goal plan should move toward an implementation record as increments
complete, including commands run, important frame or unit assumptions, and
remaining risks.

## Before Preparing a PR

When asked to prepare a pull request, do not try to create the PR through
Bitbucket REST APIs, CLI helpers, browser automation, or other remote PR creation
surfaces. The project owner creates PRs manually on the Bitbucket site. Treat
`prepare a PR` as: review the notes, scrub stale documentation, run appropriate
validation, and prepare concise PR notes for the user.

Before preparing pull request notes for any branch, do a documentation and stale
state pass:

- Review top-level `README.md` for stale architecture, setup, workflow, or
  status language introduced by the branch.
- Review any touched `docs/goals/...` README, plan, spec,
  record, or note files for status accuracy and completed-task summaries.
- Review `docs/DESIGN.md` and `docs/ARCHITECTURE.md` if present. If the branch
  introduces design decisions, component boundaries, runtime paths, launch
  composition, developer command surfaces, or external integrations, create or
  update the relevant doc so the repo has an accurate record.
- Tidy branch-local docs, examples, commands, and verification notes so they
  match the implemented behavior.
- Check for stale wording such as `draft`, `in_progress`, `future`, or
  `likely` after a task has been implemented and verified.
- Keep unrelated documentation churn out of the PR.

Write the PR notes in markdown form and save in the `artifacts/pr_notes` folder.
