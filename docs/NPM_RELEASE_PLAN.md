# AABX npm Release Plan

## Goal

Define a reliable local test and release process for publishing AABX packages to npm using Changesets and GitHub Actions.

## Current Prerequisites

- Node.js 22.x installed
- npm 11.5.2 installed
- Repository configured with npm workspaces and Turbo
- Release workflow present at .github/workflows/release.yml
- Changesets config present at .changeset/config.json

## One-Time Setup

1. Decide publish access per package.
- If package is public, set publishConfig.access to public in that package.
- If package is internal/private, keep private true and exclude from publish.

2. Verify package metadata for each publishable package.
- name
- version
- description
- license
- repository
- engines (optional but recommended)

3. Configure GitHub secrets.
- NPM_TOKEN with publish permission for your npm org/scope.

4. Ensure default branch is main and CI has permission to create PRs.

## Local Test Workflow (Before Every Release)

1. Install dependencies from lockfile.
- npm ci

2. Run quality gates.
- npm run lint
- npm run typecheck
- npm run test
- npm run build

3. Smoke-test CLI behavior.
- npm --workspace @mspvirajpatel/aabx run dev -- doctor --json
- npm --workspace @mspvirajpatel/aabx run dev -- devices
- npm --workspace @mspvirajpatel/aabx run dev -- build ./missing.aab
- npm --workspace @mspvirajpatel/aabx run dev -- install ./missing.apk

4. Validate pack output for publishable packages.
- npm pack --workspace @mspvirajpatel/aabx --dry-run

## Changeset Authoring

1. Create a changeset for user-visible changes.
- npm exec @changesets/cli -- add

2. Confirm pending release entries.
- npm exec @changesets/cli -- status

Note:
If status fails with "Failed to find where HEAD diverged", create the initial commit first and ensure branch main exists locally.

## Release Flow (GitHub Actions)

1. Merge feature PRs containing changeset files into main.
2. On push to main, release workflow runs changesets/action.
3. Workflow opens or updates a release PR with version bumps.
4. Merge the release PR.
5. Workflow publishes packages to npm using NPM_TOKEN.

## First Release Plan (Recommended Sequence)

Phase 1: Repo Readiness
- Confirm package fields for all publishable workspaces.
- Confirm private vs public package boundaries.
- Confirm CI green on main.

Phase 2: Release Candidate Validation
- Run full local test workflow.
- Run npm pack dry-run for each publishable package.
- Create one changeset covering this release scope.

Phase 3: Automation Validation
- Push to main and verify release PR creation.
- Review version bumps and changelog entries.
- Merge release PR.

Phase 4: Post-Release Verification
- Verify published versions on npm.
- Install released package in a clean temp project.
- Run basic CLI command to validate runtime.

## Suggested Definition of Done

- All quality gates pass locally and in CI.
- At least one changeset merged for intended package updates.
- Release PR generated and merged successfully.
- npm publish completed without manual patching.
- Published package install and smoke test verified.

## Optional Hardening

- Add provenance and trusted publishing configuration.
- Add release notes template for user-facing changes.
- Add canary pre-release channel for testing.
