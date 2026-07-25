# CLAUDE.md

## Code Style

Never write conversation context into code comments, documentation, or commit messages.
If something only made sense because we just talked about it, it doesn't belong in the codebase.

Comments must read correctly to someone seeing the file for the first time, with no knowledge of how it changed.
Never describe the code as a change or in contrast to a past state: no "now", "no longer", "used to", "previously", "instead of", "anymore", "X is no longer needed".
If a comment only makes sense as a diff against an earlier version, delete it.
State what the code does and why it exists, not how it came to be.
Git history is where change lives.

Do not add unnecessary comments that explain obvious code.
Only add comments if the reason for some line of code is unclear.
Do not remove or reword a comment because you didn't write it, don't see why it's there, or think it's redundant.
Assume it records a reason worth keeping.
Change a comment only when the code it describes changed enough to make it wrong or misleading, or when the comment itself breaks these style rules.
Then correct it, don't just drop it.
Delete a comment outright only when explicitly asked, or when the code it described no longer exists.

No type assertions.
If the types don't fit, fix the design, but `as const` is always OK.

No conditional logic in tests.
No `if` / early-return guards before assertions, no ternaries selecting which assertion to run, no try/catch around `expect`.
If a value might be null, assert it isn't (`expect(x).not.toBeNull()`).
A test that needs a branch has a bad setup, fix the setup.


## Dependencies

`typescript` is a peer dependency, capped to a supported major range (e.g. `>=5.8.0 <7`).
Keep it a peer, never a bundled direct dependency.
The tool parses the client's source with the client's own compiler, so the parser always matches the client's language level and cannot silently misread newer syntax.
On a version break, cap the peer range so an unsupported major fails at install instead of running with results we cannot guarantee.


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
