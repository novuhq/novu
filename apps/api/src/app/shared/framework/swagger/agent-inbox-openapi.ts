import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  PathItemObject,
  ReferenceObject,
  SchemaObject,
  SecuritySchemeObject,
} from '@nestjs/swagger';

/** Matches the dashboard proxy: a call that omits the agent uses the relay agent. */
export const DEFAULT_RELAY_AGENT_IDENTIFIER = 'human-relay';

export const AGENT_INBOX_API_KEY_SCHEME = 'ApiKey';
export const AGENT_INBOX_KEYLESS_SCHEME = 'Keyless';
export const AGENT_INBOX_SERVER_URL = 'https://www.agentinbox.md/api';
export const AGENT_INBOX_OPENAPI_TITLE = 'Agent Inbox API';

const AGENT_IDENTIFIER = 'agentIdentifier';
const KEYLESS_IDENTIFIER_HEADER = 'Novu-Application-Identifier';
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
const COMPONENT_GROUPS = ['schemas', 'parameters', 'requestBodies', 'responses', 'headers', 'examples'] as const;

export type AgentInboxHttpMethod = (typeof HTTP_METHODS)[number];

/** How a published operation authenticates. Public routes carry an empty security requirement. */
export type AgentInboxRouteAuth = 'public' | 'apiKey' | 'apiKeyOrKeyless';

export interface AgentInboxRoute {
  method: AgentInboxHttpMethod;
  /** Public path on `agentinbox.md/api`, with `:param` placeholders. */
  path: string;
  /** Nest path the proxy forwards to, with `:param` placeholders. */
  novuPath: string;
  auth: AgentInboxRouteAuth;
}

interface OpenApiComponents {
  schemas?: Record<string, SchemaObject>;
  parameters?: Record<string, ParameterObject>;
  requestBodies?: Record<string, SchemaObject>;
  responses?: Record<string, SchemaObject>;
  headers?: Record<string, SchemaObject>;
  examples?: Record<string, SchemaObject>;
  securitySchemes?: Record<string, SecuritySchemeObject>;
}

type ComponentGroup = (typeof COMPONENT_GROUPS)[number];

/**
 * Higher scores are better. A static segment on both sides outranks two parameters, which outrank a
 * parameter swallowing a literal (so `/inbox/{identifier}` wins over `/inbox/counts` for `:conversationId`).
 * `null` when the paths cannot be the same route. A longer document path may carry a context-path prefix.
 */
export function pathMatchScore(documentPath: string, novuPath: string): number | null {
  const documentSegments = pathSegments(documentPath);
  const routeSegments = pathSegments(novuPath);
  const offset = documentSegments.length - routeSegments.length;
  if (offset < 0) {
    return null;
  }

  for (let index = 0; index < offset; index += 1) {
    if (isParameter(documentSegments[index])) {
      return null;
    }
  }

  let score = 0;
  for (let index = 0; index < routeSegments.length; index += 1) {
    const documentSegment = documentSegments[index + offset];
    const routeSegment = routeSegments[index];
    const documentIsParameter = isParameter(documentSegment);
    const routeIsParameter = isParameter(routeSegment);

    if (!documentIsParameter && !routeIsParameter) {
      if (documentSegment !== routeSegment) {
        return null;
      }

      score += 2;
      continue;
    }

    if (documentIsParameter && routeIsParameter) {
      score += 1;
    }

    // A parameter on one side may match a literal on the other, and ranks below two real parameters.
  }

  return score;
}

/** True when a Novu document publishes a path whose own segment is `human`. */
export function novuDocumentIncludesHumanRoutes(document: OpenAPIObject): boolean {
  return Object.keys(document.paths ?? {}).some((path) => path.split('/').includes('human'));
}

export function assertNovuDocumentOmitsHumanRoutes(document: OpenAPIObject): void {
  if (!novuDocumentIncludesHumanRoutes(document)) {
    return;
  }

  const humanPaths = Object.keys(document.paths ?? {}).filter((path) => path.split('/').includes('human'));

  throw new Error(`Novu OpenAPI still publishes human routes: ${humanPaths.join(', ')}`);
}

/**
 * One Agent Inbox operation per proxy route. Schemas come from the Nest document. Paths, security, and
 * the document title are the public contract, and Novu SDK extensions are removed.
 */
export function projectAgentInboxOpenApi(input: {
  document: OpenAPIObject;
  routes: readonly AgentInboxRoute[];
  version: string;
}): OpenAPIObject {
  assertUniquePublicRoutes(input.routes);

  const paths: OpenAPIObject['paths'] = {};
  for (const route of input.routes) {
    const projected = projectRoute(input.document, route);
    const pathItem = paths[projected.path] ?? {};
    pathItem[route.method] = projected.operation;
    paths[projected.path] = pathItem;
  }

  const sortedPaths = sortPaths(paths);
  const components = pruneComponents(input.document.components, sortedPaths);
  const document: OpenAPIObject = {
    openapi: input.document.openapi ?? '3.0.0',
    info: {
      title: AGENT_INBOX_OPENAPI_TITLE,
      version: input.version,
      description:
        'HTTP API for Agent Inbox. The CLI, the MCP server, and https://www.agentinbox.md/api serve these routes.',
    },
    servers: [{ url: AGENT_INBOX_SERVER_URL }],
    paths: sortedPaths,
    components: {
      ...components,
      securitySchemes: {
        [AGENT_INBOX_API_KEY_SCHEME]: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'API key authentication. Send `Authorization: ApiKey <secret>`.',
        },
        [AGENT_INBOX_KEYLESS_SCHEME]: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description:
            'Keyless authentication. Send `Authorization: Keyless <identifier>` and the same identifier in `Novu-Application-Identifier`.',
        },
      },
    },
  };

  stripSdkExtensions(document);

  return document;
}

function assertUniquePublicRoutes(routes: readonly AgentInboxRoute[]): void {
  const seen = new Map<string, AgentInboxRoute>();
  for (const route of routes) {
    const key = `${route.method} ${route.path}`;
    const previous = seen.get(key);
    if (previous) {
      throw new Error(
        `Agent Inbox routes claim the same public operation ${route.method.toUpperCase()} ${route.path}: ${previous.novuPath} and ${route.novuPath}`
      );
    }

    seen.set(key, route);
  }
}

function projectRoute(document: OpenAPIObject, route: AgentInboxRoute): { path: string; operation: OperationObject } {
  const match = findOperation(document, route);
  const operation = clone(match.operation);
  operation.parameters = rewriteParameters(operationParameters(match.pathItem, match.operation), match.path, route);
  delete operation.servers;
  applySecurity(operation, route.auth);
  publishInterceptorBody(operation, document);

  return { path: toOpenApiPath(route.path), operation };
}

function findOperation(
  document: OpenAPIObject,
  route: AgentInboxRoute
): { path: string; pathItem: PathItemObject; operation: OperationObject } {
  const matches: Array<{ path: string; score: number }> = [];
  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    if (!pathItem?.[route.method]) {
      continue;
    }

    const score = pathMatchScore(path, route.novuPath);
    if (score === null) {
      continue;
    }

    matches.push({ path, score });
  }

  if (matches.length === 0) {
    throw new Error(
      `No ${route.method.toUpperCase()} operation for Agent Inbox route ${route.path} (${route.novuPath})`
    );
  }

  matches.sort((left, right) => right.score - left.score);
  const best = matches[0];
  const tied = matches.filter((match) => match.score === best.score);
  if (tied.length > 1) {
    throw new Error(
      `Agent Inbox route ${route.method.toUpperCase()} ${route.novuPath} matches more than one operation: ${tied
        .map((match) => match.path)
        .join(', ')}`
    );
  }

  const pathItem = document.paths?.[best.path];
  const operation = pathItem?.[route.method];
  if (!pathItem || !operation) {
    throw new Error(`No ${route.method.toUpperCase()} operation at ${best.path}`);
  }

  return { path: best.path, pathItem, operation };
}

function operationParameters(pathItem: PathItemObject, operation: OperationObject): ParameterObject[] {
  return [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])].map((parameter) => clone(parameter));
}

function rewriteParameters(
  parameters: ParameterObject[],
  documentPath: string,
  route: AgentInboxRoute
): ParameterObject[] {
  const paired = pairParameters(documentPath, route);
  const renamed = parameters.map((parameter) => renameParameter(parameter, paired));
  const lifted = paired.liftedNestNames;
  const withoutLifted = renamed.filter((parameter) => !(parameter.in === 'path' && lifted.includes(parameter.name)));
  const withQuery = liftAgentIdentifier(withoutLifted, parameters, paired);

  return ensurePublicPathParameters(withQuery, route.path);
}

interface PairedParameters {
  /** Nest path parameter name → public path parameter name. */
  rename: Map<string, string>;
  /** Nest path parameter names that leave the path and become the `agentIdentifier` query. */
  liftedNestNames: string[];
}

function pairParameters(documentPath: string, route: AgentInboxRoute): PairedParameters {
  const documentSegments = alignedDocumentSegments(documentPath, route.novuPath);
  const routeSegments = pathSegments(route.novuPath);
  const nestNames: string[] = [];
  const novuNames: string[] = [];

  for (let index = 0; index < routeSegments.length; index += 1) {
    if (!isParameter(documentSegments[index]) || !isParameter(routeSegments[index])) {
      continue;
    }

    nestNames.push(parameterName(documentSegments[index]));
    novuNames.push(parameterName(routeSegments[index]));
  }

  const publicNames = parameterNames(route.path);
  const liftedNovuNames = novuNames.filter((name) => !publicNames.includes(name));
  const unexpected = liftedNovuNames.filter((name) => name !== AGENT_IDENTIFIER);
  if (unexpected.length > 0) {
    throw new Error(
      `Agent Inbox route ${route.path} drops path parameters ${unexpected.join(', ')} from ${route.novuPath}`
    );
  }

  const rename = new Map<string, string>();
  for (const publicName of publicNames) {
    const novuIndex = novuNames.indexOf(publicName);
    if (novuIndex < 0) {
      throw new Error(`Cannot map parameters of ${route.novuPath} onto ${route.path}`);
    }

    rename.set(nestNames[novuIndex], publicName);
  }

  const liftedNestNames = liftedNovuNames.map((novuName) => nestNames[novuNames.indexOf(novuName)]);

  return { rename, liftedNestNames };
}

function renameParameter(parameter: ParameterObject, paired: PairedParameters): ParameterObject {
  if (parameter.in !== 'path' || !parameter.name) {
    return parameter;
  }

  const publicName = paired.rename.get(parameter.name);
  if (!publicName) {
    return parameter;
  }

  return { ...parameter, name: publicName };
}

function liftAgentIdentifier(
  parameters: ParameterObject[],
  original: ParameterObject[],
  paired: PairedParameters
): ParameterObject[] {
  if (paired.liftedNestNames.length === 0) {
    return parameters;
  }

  const alreadyQuery = parameters.some((parameter) => parameter.in === 'query' && parameter.name === AGENT_IDENTIFIER);
  if (alreadyQuery) {
    return parameters;
  }

  const source = original.find(
    (parameter) => parameter.in === 'path' && parameter.name && paired.liftedNestNames.includes(parameter.name)
  );
  const queryParameter: ParameterObject = source
    ? {
        ...source,
        name: AGENT_IDENTIFIER,
        in: 'query',
        required: false,
        description: source.description ?? agentIdentifierDescription(),
      }
    : {
        name: AGENT_IDENTIFIER,
        in: 'query',
        required: false,
        description: agentIdentifierDescription(),
        schema: { type: 'string', default: DEFAULT_RELAY_AGENT_IDENTIFIER },
      };

  if (queryParameter.schema && typeof queryParameter.schema === 'object' && !('$ref' in queryParameter.schema)) {
    queryParameter.schema = { ...queryParameter.schema, default: DEFAULT_RELAY_AGENT_IDENTIFIER };
  }

  return [...parameters, queryParameter];
}

function ensurePublicPathParameters(parameters: ParameterObject[], publicPath: string): ParameterObject[] {
  const present = new Set(parameters.filter((parameter) => parameter.in === 'path').map((parameter) => parameter.name));
  const missing = parameterNames(publicPath).filter((name) => !present.has(name));
  const added = missing.map(
    (name): ParameterObject => ({
      name,
      in: 'path',
      required: true,
      schema: { type: 'string' },
    })
  );

  return [...parameters, ...added];
}

/**
 * `ResponseInterceptor` returns a paginated body unchanged when it already has `data` and no `id`.
 * Every other JSON body is returned as `{ data }`. `@ApiResponse` always adds that wrapper, so a page
 * is documented one level too deep until this removes it.
 */
function publishInterceptorBody(operation: OperationObject, document: OpenAPIObject): void {
  const responses = operation.responses;
  if (!responses) {
    return;
  }

  for (const [status, response] of Object.entries(responses)) {
    if (!status.startsWith('2') || !response || !('content' in response)) {
      continue;
    }

    const json = response.content?.['application/json'];
    if (!json?.schema) {
      continue;
    }

    json.schema = responseBodySchema(json.schema, document);
  }
}

function responseBodySchema(
  schema: SchemaObject | ReferenceObject,
  document: OpenAPIObject
): SchemaObject | ReferenceObject {
  if (isResponseEnvelope(schema)) {
    const inner = schema.properties?.data;
    if (inner && interceptorPassesThrough(inner, document)) {
      return inner;
    }

    return schema;
  }

  if (interceptorPassesThrough(schema, document)) {
    return schema;
  }

  return {
    type: 'object',
    required: ['data'],
    properties: { data: schema },
  };
}

/** The wrapper `@ApiResponse` writes: `{ properties: { data } }` and nothing else. */
function isResponseEnvelope(
  schema: SchemaObject | ReferenceObject
): schema is SchemaObject & { properties: { data: SchemaObject | ReferenceObject } } {
  if (isReference(schema) || schema.type || schema.allOf || schema.oneOf || schema.anyOf || !schema.properties) {
    return false;
  }

  const keys = Object.keys(schema);
  if (keys.some((key) => key !== 'properties' && key !== 'description')) {
    return false;
  }

  return Object.keys(schema.properties).length === 1 && schema.properties.data !== undefined;
}

function interceptorPassesThrough(schema: SchemaObject | ReferenceObject, document: OpenAPIObject): boolean {
  const names = propertyNames(schema, document, new Set<string>());

  return names.includes('data') && !names.includes('id') && !names.includes('_id');
}

function propertyNames(schema: SchemaObject | ReferenceObject, document: OpenAPIObject, seen: Set<string>): string[] {
  const resolved = resolveSchema(schema, document);
  if (!resolved) {
    return [];
  }

  const names = Object.keys(resolved.properties ?? {});
  for (const part of resolved.allOf ?? []) {
    if (isReference(part) && seen.has(part.$ref)) {
      continue;
    }

    if (isReference(part)) {
      seen.add(part.$ref);
    }

    names.push(...propertyNames(part, document, seen));
  }

  return names;
}

function resolveSchema(schema: SchemaObject | ReferenceObject, document: OpenAPIObject): SchemaObject | undefined {
  if (!isReference(schema)) {
    return schema;
  }

  const name = schema.$ref.replace('#/components/schemas/', '');
  const target = document.components?.schemas?.[name];
  if (!target || isReference(target)) {
    return undefined;
  }

  return target;
}

function isReference(schema: SchemaObject | ReferenceObject): schema is ReferenceObject {
  return '$ref' in schema && typeof schema.$ref === 'string';
}

function applySecurity(operation: OperationObject, auth: AgentInboxRouteAuth): void {
  operation.security = securityRequirements(auth);
  if (auth !== 'apiKeyOrKeyless') {
    return;
  }

  const parameters = operation.parameters ?? [];
  const hasHeader = parameters.some(
    (parameter) => parameter.in === 'header' && parameter.name === KEYLESS_IDENTIFIER_HEADER
  );
  if (hasHeader) {
    return;
  }

  operation.parameters = [
    ...parameters,
    {
      name: KEYLESS_IDENTIFIER_HEADER,
      in: 'header',
      required: false,
      description: 'Keyless identifier. Send the same value as `Authorization: Keyless <identifier>`.',
      schema: { type: 'string' },
    },
  ];
}

function securityRequirements(auth: AgentInboxRouteAuth): Array<Record<string, string[]>> {
  switch (auth) {
    case 'public':
      return [];
    case 'apiKey':
      return [{ [AGENT_INBOX_API_KEY_SCHEME]: [] }];
    case 'apiKeyOrKeyless':
      return [{ [AGENT_INBOX_API_KEY_SCHEME]: [] }, { [AGENT_INBOX_KEYLESS_SCHEME]: [] }];
    default: {
      const exhaustive: never = auth;

      return exhaustive;
    }
  }
}

function pruneComponents(source: OpenAPIObject['components'], paths: OpenAPIObject['paths']): OpenApiComponents {
  const components: OpenApiComponents = {};
  if (!source) {
    return components;
  }

  const used = new Map<ComponentGroup, Set<string>>();
  for (const group of COMPONENT_GROUPS) {
    used.set(group, new Set());
  }

  const queue: Array<{ group: ComponentGroup; name: string }> = [];
  const enqueue = (node: unknown) => {
    collectComponentRefs(node, (group, name) => {
      const names = used.get(group);
      if (!names || names.has(name)) {
        return;
      }

      names.add(name);
      queue.push({ group, name });
    });
  };

  enqueue(paths);
  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) {
      continue;
    }

    const groupValue = source[next.group] as Record<string, SchemaObject> | undefined;
    const component = groupValue?.[next.name];
    if (component) {
      enqueue(component);
    }
  }

  for (const group of COMPONENT_GROUPS) {
    const names = used.get(group);
    const sourceGroup = source[group] as Record<string, SchemaObject> | undefined;
    if (!names || names.size === 0 || !sourceGroup) {
      continue;
    }

    const kept: Record<string, SchemaObject> = {};
    for (const name of [...names].sort()) {
      const component = sourceGroup[name];
      if (component) {
        kept[name] = clone(component);
      }
    }

    components[group] = kept;
  }

  return components;
}

function collectComponentRefs(
  node: unknown,
  visit: (group: ComponentGroup, name: string) => void,
  seen = new WeakSet<object>()
): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  if (seen.has(node)) {
    return;
  }

  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) {
      collectComponentRefs(item, visit, seen);
    }

    return;
  }

  const record = node as { $ref?: string };
  if (typeof record.$ref === 'string') {
    const ref = componentRef(record.$ref);
    if (ref) {
      visit(ref.group, ref.name);
    }
  }

  for (const value of Object.values(record)) {
    collectComponentRefs(value, visit, seen);
  }
}

function componentRef(ref: string): { group: ComponentGroup; name: string } | null {
  for (const group of COMPONENT_GROUPS) {
    const prefix = `#/components/${group}/`;
    if (!ref.startsWith(prefix)) {
      continue;
    }

    return { group, name: decodeURIComponent(ref.slice(prefix.length)) };
  }

  return null;
}

function sortPaths(paths: OpenAPIObject['paths']): OpenAPIObject['paths'] {
  const sorted: OpenAPIObject['paths'] = {};
  for (const path of Object.keys(paths).sort()) {
    const pathItem = paths[path];
    if (!pathItem) {
      continue;
    }

    const ordered: PathItemObject = {};
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (operation) {
        ordered[method] = operation;
      }
    }

    sorted[path] = ordered;
  }

  return sorted;
}

function stripSdkExtensions(node: unknown, seen = new WeakSet<object>()): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  if (seen.has(node)) {
    return;
  }

  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) {
      stripSdkExtensions(item, seen);
    }

    return;
  }

  const record = node as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key.startsWith('x-speakeasy')) {
      delete record[key];
      continue;
    }

    stripSdkExtensions(record[key], seen);
  }
}

function alignedDocumentSegments(documentPath: string, novuPath: string): string[] {
  const documentSegments = pathSegments(documentPath);
  const routeSegments = pathSegments(novuPath);
  const offset = documentSegments.length - routeSegments.length;

  return documentSegments.slice(offset);
}

function agentIdentifierDescription(): string {
  return `Relay agent this call is about. Defaults to \`${DEFAULT_RELAY_AGENT_IDENTIFIER}\`.`;
}

function toOpenApiPath(path: string): string {
  return path.replace(/:(\w+)/g, '{$1}');
}

function parameterNames(path: string): string[] {
  return pathSegments(path).filter(isParameter).map(parameterName);
}

function pathSegments(path: string): string[] {
  return path.split('/').filter((segment) => segment.length > 0);
}

function isParameter(segment: string): boolean {
  return segment.startsWith(':') || (segment.startsWith('{') && segment.endsWith('}'));
}

function parameterName(segment: string): string {
  if (segment.startsWith(':')) {
    return segment.slice(1);
  }

  return segment.slice(1, -1);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
