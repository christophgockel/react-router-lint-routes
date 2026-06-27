// Minimal representation of a route from `react-router routes --json`.
// A route is either a leaf with a path, a layout with children, or both.
// React Router does not export a type for its CLI output, so we define
// only the fields we need and rely on a runtime guard in extractPaths()
// to detect shape changes.
export type Route = { path: string; children?: Route[] } | { path?: never; children: Route[] };

export function extractPaths(routes: Route[]): string[] {
  const paths: string[] = [];

  for (const route of routes) {
    if (route.path !== undefined && route.path !== "") {
      paths.push(route.path.startsWith("/") ? route.path : `/${route.path}`);
    }

    if (route.children) {
      paths.push(...extractPaths(route.children));
    }
  }

  if (routes.length > 0 && paths.length === 0) {
    throw new Error(
      "react-router routes --json returned routes but no paths were extracted. " +
        "The JSON shape may have changed. Check that route objects still use 'path' and 'children' fields.",
    );
  }

  return paths;
}

export function createRouteMatcher(allRoutes: string[]) {
  // "/" is excluded: href("/") returns "/" unchanged, so wrapping it adds no type-safety.
  // It would also flag perfectly fine uses like <Link to="/#features">.
  const staticRoutes = new Set(allRoutes.filter((r) => !r.includes(":") && r !== "/"));

  // For parameterised routes like /products/:id, extract the fixed prefix before the
  // first parameter segment ("/products/") so we can catch interpolated or concatenated paths
  // that construct the URL dynamically instead of using href("/products/:id", { id }).
  const parameterisedPrefixes = [
    ...new Set(allRoutes.filter((r) => r.includes(":")).map((r) => r.substring(0, r.indexOf("/:") + 1))),
  ];

  return function matchesRoute(value: string): boolean {
    if (staticRoutes.has(value)) {
      return true;
    }

    return parameterisedPrefixes.some((prefix) => value.startsWith(prefix));
  };
}
