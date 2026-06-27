# CLAUDE.md

## Commands

_Always_ use one of the following commands to run tasks.
_Never_ run anything with `npx` or `tsc` directly.

| Task              | Command                                                       |
|-------------------|---------------------------------------------------------------|
| Run the tool      | `npm run start`                                               |
| Unit tests        | `npm run test`                                                |
| Single test file  | `npm run test -- test/path/to/file.test.ts`                   |
| Lint              | `npm run lint`                                                |
| Fix Lint issues   | `npm run lint:fix`                                            |
| Type check        | `npm run typecheck`                                           |
| All checks | `npm run verify` (lint + typecheck + unit tests) |

After every feature make sure to run `npm run lint:fix` and `npm run verify` to ensure everything is in order.
