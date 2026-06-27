# CLAUDE.md

## Code Style

Never write conversation context into code comments, documentation, or commit messages.
If something only made sense because we just talked about it, it doesn't belong in the codebase.

Do not add unnecessary comments that explain obvious code.
Only add comments if the reason for some line of code is unclear.
When editing code, never remove existing comments.
Only modify comments when the content does not reflect the behaviour or intent any more.
Only delete comments when explicitly asked.

No type assertions.
If the types don't fit, fix the design, but `as const` is always OK.

No conditional logic in tests.
No `if` / early-return guards before assertions, no ternaries selecting which assertion to run, no try/catch around `expect`.
If a value might be null, assert it isn't (`expect(x).not.toBeNull()`).
A test that needs a branch has a bad setup, fix the setup.

## Commands

_Always_ use one of the following commands to run tasks.
_Never_ run anything with `npx` or `tsc` directly.

| Task             | Command                                     |
|------------------|---------------------------------------------|
| Run the tool     | `npm run start`                             |
| All tests        | `npm run test`                              |
| Single test file | `npm run test -- test/path/to/file.test.ts` |
| Lint             | `npm run lint`                              |
| Fix lint issues  | `npm run lint:fix`                          |
| Type check       | `npm run typecheck`                         |
| All checks       | `npm run verify` (lint + typecheck + tests) |

After every feature make sure to run `npm run lint:fix` and `npm run verify` to ensure everything is in order.
