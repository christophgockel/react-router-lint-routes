# End-to-end tests

These tests run the CLI against real React Router projects to verify it works in a realistic setting.


## Fixture projects

There are multiple fixture projects:

- `fixture/` contains a React Router 7 and TypeScript 5 project.
- `fixture-ts7/` contains a React Router 8 and TypeScript 7 project.

The projects have been scaffolded with:

```sh
npx create-react-router@latest test/e2e/fixture --yes --no-git-init --no-install
```

After scaffolding, two things were added:

1. `app/routes.ts` was extended with static and parameterised routes (`/login`, `/dashboard`, `/products/:id`) to cover all matching cases.
2. `app/violations.ts` was added with every violation type the linter detects (string literal, template literal, template with interpolation, concatenation) plus safe counterparts that should not be flagged.

All fixture projects should contain the same violations.
This enables the E2E tests to be run against all projects with the same expectations.


## Updating the fixture(s)

When a new React Router version changes the project structure or `routes --json` output, re-scaffold:

```sh
rm -rf test/e2e/fixture
npx create-react-router@latest test/e2e/fixture --yes --no-git-init --no-install
```

Then re-apply the route and violation changes described above.
