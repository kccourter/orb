# Agent Instructions

## Standard New-Branch Workflow

For new feature or integration branches, use this default flow before coding:

1. Define the branch goal.
2. Write or update the relevant plan under `docs/goals/...`.
3. Present the plan for user review and approval.
4. Implement only after approval.

Small investigative commands, repository inspection, and validation checks are
fine before approval, but avoid landing code changes on a new branch until the
goal and plan are agreed.

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
- Review `docs/DESIGN.md` and any touched `docs/goals/...` README, plan, spec,
  record, or note files for status accuracy and completed-task summaries.
- Review `docs/ARCHITECTURE.md` and update the architecture diagram when the
  branch changes component boundaries, runtime paths, launch composition,
  developer command surfaces, or external integrations.
- When a change affects setup, validation, workflow execution, scenario
  selection, artifact paths, external integrations, or developer ergonomics,
  update the `camlab` CLI as part of the same task rather than leaving it as a
  follow-up.
- Tidy branch-local docs, examples, commands, and verification notes so they
  match the implemented behavior.
- Check for stale wording such as `draft`, `in_progress`, `future`, or
  `likely` after a task has been implemented and verified.
- Keep unrelated documentation churn out of the PR.

Write the PR notes in markdown form and save in the artifacts/pr_notes folder. 
