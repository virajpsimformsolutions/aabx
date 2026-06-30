# Changesets

This folder controls versioning and publishing with Changesets.

## How to create a release entry

Run:

```bash
npm exec changeset
```

Then choose the package(s) and bump type (`patch`, `minor`, `major`).

## Release flow

- A changeset file in this folder triggers the release workflow on `main`.
- The workflow opens/updates a release PR with version bumps.
- After the release PR is merged, the workflow publishes packages.
