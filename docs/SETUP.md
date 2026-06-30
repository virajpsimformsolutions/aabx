# AABX Setup

## Package Manager

Default package manager is npm.

Yarn is also supported for users who prefer it.

## Install Dependencies

Using npm:

```bash
npm install
```

Using Yarn:

```bash
yarn install
```

## Run Common Tasks

Using npm:

```bash
npm run typecheck
npm run build
npm run test
npm run lint
```

Using Yarn:

```bash
yarn typecheck
yarn build
yarn test
yarn lint
```

## Run CLI During Development

From the repository root:

Using npm:

```bash
npm run dev -- --filter=@mspvirajpatel/aabx
```

Using Yarn:

```bash
yarn dev --filter=@mspvirajpatel/aabx
```

Run a command inside the CLI workspace from repository root:

Using npm:

```bash
npm --workspace @mspvirajpatel/aabx run dev -- doctor --json
```

Using Yarn:

```bash
yarn workspace @mspvirajpatel/aabx dev doctor --json
```

From the CLI workspace directly (`apps/cli`):

Using npm:

```bash
npm run dev -- doctor --json
```

Using Yarn:

```bash
yarn dev doctor --json
```
