# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Unreleased]

## [1.3.0] - 2026-07-25

### Added

- Support for TypeScript 7 projects.
  The tool works against both the classic TypeScript compiler API (5.8–6.x) and the native TypeScript 7 API.

### Changed

- Widened the `typescript` peer dependency to `>=5.8.0` again, removing the `<7` cap.


## [1.2.1] - 2026-07-25

### Changed

- Capped the supported `typescript` peer dependency range below 7 (`>=5.8.0 <7`).
  TypeScript 7's compiler API is not yet supported, so installing against it now fails fast instead of breaking at runtime.


## [1.2.0] - 2026-06-29

### Fixed

- The package is now shipping compiled JavaScript instead of raw TypeScript sources.
  Fixes the error:

  ```
  Error [ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING]: Stripping types is currently unsupported for files under node_modules,
  ```

  This was an issue on my part thinking that Node's feature of stripping types would already work for dependencies.


## [1.1.1] - 2026-06-28

### Fixed

- Added missing `repository` field in package.json required for npm publishing.


## [1.1.0] - 2026-06-28

### Changed

- CLI output: violations are now grouped by file instead of repeating the file name for each violation.
  Each file appears once, with its violations listed below it.

  Before:

  ```
  src/foo.tsx:5
      "/users"

  src/foo.tsx:12
      "/users/:id"
  ```

  After:

  ```
  src/foo.tsx
      Line 5: "/users"
      Line 12: "/users/:id"
  ```


## [1.0.0] - 2026-06-27

### Added

- CLI tool to lint route paths for missing `href()` usage
- Static route matching (exact match) and parameterised route matching (prefix match)
- Detection of string literals, template literals, and string concatenations
- `--directory` option to specify the scan directory (default: `app`)
- `--tsconfig` option to specify the TypeScript config file (default: `tsconfig.json`)
- `--exclude` option to skip files, additive with the default exclusion of `routes.ts`
- CLI output showing effective scan settings (directory, tsconfig, excluded files)
- Runtime guard in `extractPaths` to detect changes in React Router's JSON output shape


[Unreleased]: https://github.com/christophgockel/react-router-lint-routes/compare/1.3.0...HEAD
[1.3.0]: https://github.com/christophgockel/react-router-lint-routes/compare/1.2.1...1.3.0
[1.2.1]: https://github.com/christophgockel/react-router-lint-routes/compare/1.2.0...1.2.1
[1.2.0]: https://github.com/christophgockel/react-router-lint-routes/compare/1.1.1...1.2.0
[1.1.1]: https://github.com/christophgockel/react-router-lint-routes/compare/1.1.0...1.1.1
[1.1.0]: https://github.com/christophgockel/react-router-lint-routes/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/christophgockel/react-router-lint-routes/releases/tag/1.0.0
