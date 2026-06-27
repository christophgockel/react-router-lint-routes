# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Unreleased]

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


## Links

[1.0.0]: https://github.com/christophgockel/react-router-lint-routes/releases/tag/v1.0.0
