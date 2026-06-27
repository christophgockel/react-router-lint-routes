# End-to-end tests

These tests run the CLI against a real React Router project to verify it works in a realistic setting.


## Fixture project

The `fixture/` directory is a minimal React Router 7 project scaffolded with:

```sh
npx create-react-router@latest test/e2e/fixture --yes --no-git-init --no-install
```

After scaffolding, two things were added:

1. `app/routes.ts` was extended with static and parameterised routes (`/login`, `/dashboard`, `/products/:id`) to cover all matching cases.
2. `app/violations.ts` was added with every violation type the linter detects (string literal, template literal, template with interpolation, concatenation) plus safe counterparts that should not be flagged.


## Updating the fixture

When a new React Router version changes the project structure or `routes --json` output, re-scaffold:

```sh
rm -rf test/e2e/fixture
npx create-react-router@latest test/e2e/fixture --yes --no-git-init --no-install
```

Then re-apply the route and violation changes described above.
