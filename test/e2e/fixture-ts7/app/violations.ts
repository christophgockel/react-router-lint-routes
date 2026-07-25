// This file exercises every detection case for the linter.
// Each violation type has a matching safe counterpart to verify no false positives.

import { href } from "react-router";

const id = "42";

// --- Should be flagged ---

// Plain string literal matching a static route
const stringLiteral = "/login";

// Template literal without interpolation matching a static route
const templateLiteral = `/dashboard`;

// Template literal with interpolation matching a parameterised route prefix
const templateInterpolation = `/products/${id}`;

// String concatenation matching a parameterised route prefix
// biome-ignore lint/style/useTemplate: this is intentional in this file
const concatenation = "/products/" + id;

// --- Should NOT be flagged ---

// Wrapped in href() — type-safe
const safe1 = href("/login");
const safe2 = href("/dashboard");
const safe3 = href("/products/:id", { id });

// Not a known route
const notARoute = "/unknown";

// No leading slash
const noSlash = "login";

// Root path "/" is excluded
const root = "/";

export {
  concatenation,
  noSlash,
  notARoute,
  root,
  safe1,
  safe2,
  safe3,
  stringLiteral,
  templateInterpolation,
  templateLiteral,
};
