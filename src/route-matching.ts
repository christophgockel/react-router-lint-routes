// Minimal representation of a route from `react-router routes --json`.
// A route is either a leaf with a path, a layout with children, or both.
// React Router does not export a type for its CLI output, so we define
// only the fields we need.
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

  return paths;
}

export function createRouteMatcher(allRoutes: string[]) {
  // "/" is excluded: it appears frequently in non-route contexts (path construction, URL
  // manipulation) where flagging it would produce false positives.
  // It also cannot be renamed the way other routes can, so href("/") provides minimal
  // type-safety benefit in practice.
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
