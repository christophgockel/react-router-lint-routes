import { describe, expect, it } from "vitest";
import { createRouteMatcher, extractPaths, type Route } from "../src/route-matching.ts";

describe("extractPaths", () => {
  it("extracts paths from flat routes", () => {
    const routes = [{ path: "/login" }, { path: "/about" }];

    expect(extractPaths(routes)).toEqual(["/login", "/about"]);
  });

  it("extracts paths from nested routes", () => {
    const routes = [
      {
        path: "/dashboard",
        children: [{ path: "/dashboard/settings" }],
      },
    ];

    expect(extractPaths(routes)).toEqual(["/dashboard", "/dashboard/settings"]);
  });

  it("normalises relative paths with a leading slash", () => {
    const routes = [{ path: "dashboard" }, { children: [{ path: "dashboard/settings" }] }];

    expect(extractPaths(routes)).toEqual(["/dashboard", "/dashboard/settings"]);
  });

  it("skips routes with no path", () => {
    const routes = [{ children: [{ path: "/login" }] }];

    expect(extractPaths(routes)).toEqual(["/login"]);
  });

  it("skips routes with an empty path", () => {
    const routes = [{ path: "" }, { path: "/login" }];

    expect(extractPaths(routes)).toEqual(["/login"]);
  });

  it("throws when routes exist but no paths are extracted", () => {
    const routes: Route[] = [{ children: [{ children: [] }] }];

    expect(() => extractPaths(routes)).toThrow("no paths were extracted");
  });

  it("returns an empty array for an empty input without throwing", () => {
    expect(extractPaths([])).toEqual([]);
  });
});

describe("createRouteMatcher", () => {
  it("matches a static route exactly", () => {
    const matches = createRouteMatcher(["/login"]);

    expect(matches("/login")).toBe(true);
  });

  it("does not match an unknown path", () => {
    const matches = createRouteMatcher(["/login"]);

    expect(matches("/unknown")).toBe(false);
  });

  it("excludes the root path", () => {
    const matches = createRouteMatcher(["/"]);

    expect(matches("/")).toBe(false);
  });

  it("matches a parameterised route by prefix", () => {
    const matches = createRouteMatcher(["/products/:id"]);

    expect(matches("/products/abc-123")).toBe(true);
  });

  it("matches the bare prefix of a parameterised route", () => {
    const matches = createRouteMatcher(["/products/:id"]);

    expect(matches("/products/")).toBe(true);
  });

  it("does not match the parent path of a parameterised route without trailing slash", () => {
    const matches = createRouteMatcher(["/products/:id"]);

    expect(matches("/products")).toBe(false);
  });

  it("does not match a path that shares a prefix but diverges", () => {
    const matches = createRouteMatcher(["/products/:id"]);

    expect(matches("/production")).toBe(false);
  });

  it("matches static routes that are also prefixes of parameterised routes", () => {
    const matches = createRouteMatcher(["/products", "/products/:id"]);

    expect(matches("/products")).toBe(true);
    expect(matches("/products/abc")).toBe(true);
  });
});
