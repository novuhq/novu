const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

const ROUTE_TUPLE = /\[\s*'(GET|POST|PUT|PATCH|DELETE)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,?\s*\]/g;
const METHOD_THEN_PATH = /'(GET|POST|PUT|PATCH|DELETE)'\s*,\s*'\/[^']+'/g;

export type ParsedProxyRoute = readonly [(typeof METHODS)[number], string, string];

/**
 * The proxy table lives in the human dashboard, whose package is ESM. The API generator is CommonJS,
 * so it reads the source. Every method literal in that file is one route, and a route we cannot parse fails the read.
 */
export function readProxyRoutes(source: string): ParsedProxyRoute[] {
  const methods = source.match(METHOD_THEN_PATH) ?? [];
  const routes = [...source.matchAll(ROUTE_TUPLE)].map(
    (match): ParsedProxyRoute => [methodOf(match[1]), match[2], match[3]]
  );
  if (routes.length === 0 || routes.length !== methods.length) {
    throw new Error(`Could not read Agent Inbox proxy routes (parsed ${routes.length} of ${methods.length})`);
  }

  return routes;
}

function methodOf(method: string): ParsedProxyRoute[0] {
  const known = METHODS.find((item) => item === method);
  if (!known) {
    throw new Error(`Unexpected proxy method ${method}`);
  }

  return known;
}
