# react-router-lint-routes

Lint route paths to enforce type-safe `href()` usage in React Router 7 projects.

Catches string literals, template literals, and string concatenations that match a known route path but are not wrapped in React Router's `href()` helper.
Without `href()`, renaming or removing a route silently breaks navigation at runtime instead of failing at build time.


## What it catches

```tsx
// Flagged - plain string, breaks silently if the route is renamed
const isSubmitting = navigation.formAction === "/settings";
fetcher.submit(data, { action: "/products/import" });
<Link to="/login" />

// Safe - href() is type-checked against the route table
const isSubmitting = navigation.formAction === href("/settings");
fetcher.submit(data, { action: href("/products/import") });
<Link to={href("/login")} />

// Also catches template literals and concatenation
const path = `/products/${id}`;       // flagged
const path = "/products/" + id;       // flagged
```


## Requirements

- Node.js >= 23.6.0 (native TypeScript execution)
- React Router >= 7.0.0
- TypeScript >= 5.8.0


## Installation

```sh
npm install --save-dev react-router-lint-routes
```


## Usage

```sh
npx react-router-lint-routes
```

By default it scans the `app/` directory using `tsconfig.json`.
The known routes are fetched from `npx react-router routes --json` at lint time so they always reflect the current route tree.


### Options

```
--directory <path>  Directory to lint (default: app)
--tsconfig <file>   TypeScript config file (default: tsconfig.json)
--exclude <file>    Files to skip, path relative to --directory, repeatable (default: routes.ts)
--help              Show help
```

`routes.ts` is excluded by default because it contains route declarations, not navigation targets.
Paths are relative to the scan directory, so `--exclude path/to/config.ts` skips `app/path/to/config.ts`.

### Examples

```sh
# Scan src/ instead of app/
npx react-router-lint-routes --directory src

# Use a custom tsconfig
npx react-router-lint-routes --tsconfig tsconfig.app.json

# Exclude additional files
npx react-router-lint-routes --exclude routes.ts --exclude legacy-links.ts
```

For ease of use add it as a script in `package.json`:

```json
{
  "scripts": {
    "lint:routes": "react-router-lint-routes"
  }
}
```

Then simply invoke it with

```sh
npm run lint:routes
```

without having to specify your project-specific settings every time.


## How it works

1. Fetches the current route tree from `npx react-router routes --json`
2. Builds a TypeScript program from the project's tsconfig
3. Walks the AST of all code files in the target directory
4. Flags any string whose value matches a known route, unless it is already an argument to an `href()` call

Static routes are matched exactly.
Parameterised routes (e.g. `/products/:id`) are matched by prefix, so both `"/products/abc"` and `` `/products/${id}` `` are caught.

The root path `"/"` is excluded from checks. It appears frequently in non-route contexts (path construction, URL manipulation) where flagging it would produce false positives. It also cannot be renamed the way other routes can, so `href("/")` provides minimal type-safety benefit in practice.


## License

MIT
