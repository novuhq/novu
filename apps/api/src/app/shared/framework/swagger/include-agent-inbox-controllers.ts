import { type INestApplication, RequestMethod, VERSION_NEUTRAL, VersioningType } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA, VERSION_METADATA } from '@nestjs/common/constants';
import type { VersioningOptions } from '@nestjs/common/interfaces';
import { ApplicationConfig, ModulesContainer } from '@nestjs/core';
import {
  type AgentInboxHttpMethod,
  type AgentInboxRoute,
  type AgentInboxRouteAuth,
  pathMatchScore,
} from './agent-inbox-openapi';
import { KEYLESS_ACCESSIBLE } from './keyless.security';

const API_EXCLUDE_CONTROLLER = 'swagger/apiExcludeController';
const API_EXCLUDE_ENDPOINT = 'swagger/apiExcludeEndpoint';
const API_SECURITY = 'swagger/apiSecurity';

type Handler = (...args: never[]) => unknown;

interface ControllerType {
  prototype: { [methodName: string]: Handler | undefined };
  new (...args: never[]): unknown;
}

interface HandlerMatch {
  metatype: ControllerType;
  handler: Handler;
  auth: AgentInboxRouteAuth;
  score: number;
}

/**
 * Nest omits `@ApiExcludeController` and `@ApiExcludeEndpoint` handlers from every Swagger document.
 * After Novu's own document is built, this reveals only the handlers a proxy route forwards to, so a
 * second in-memory document can see them. The Novu document already built is left unchanged.
 */
export function includeProxiedHandlers(
  app: INestApplication,
  routes: readonly Pick<AgentInboxRoute, 'method' | 'novuPath'>[]
): Map<string, AgentInboxRouteAuth> {
  const versioning = app.get(ApplicationConfig).getVersioning();
  const modules = app.get(ModulesContainer);
  const authByRoute = new Map<string, AgentInboxRouteAuth>();
  const revealed = new Map<ControllerType, Set<Handler>>();

  for (const route of routes) {
    const match = findHandler(modules, versioning, route);
    const handlers = revealed.get(match.metatype) ?? new Set<Handler>();
    handlers.add(match.handler);
    revealed.set(match.metatype, handlers);
    Reflect.deleteMetadata(API_EXCLUDE_CONTROLLER, match.metatype);
    Reflect.deleteMetadata(API_EXCLUDE_ENDPOINT, match.handler);
    authByRoute.set(routeKey(route.method, route.novuPath), match.auth);
  }

  // A revealed controller may also own handlers Swagger cannot describe. Those stay out of this document.
  for (const [metatype, handlers] of revealed) {
    hideUnproxiedHandlers(metatype, handlers);
  }

  return authByRoute;
}

function hideUnproxiedHandlers(metatype: ControllerType, proxied: Set<Handler>) {
  for (const methodName of Object.getOwnPropertyNames(metatype.prototype)) {
    const handler = metatype.prototype[methodName];
    if (methodName === 'constructor' || typeof handler !== 'function' || proxied.has(handler)) {
      continue;
    }

    if (httpMethodOf(handler) === undefined) {
      continue;
    }

    Reflect.defineMetadata(API_EXCLUDE_ENDPOINT, { disable: true }, handler);
  }
}

export function routeKey(method: string, novuPath: string): string {
  return `${method.toUpperCase()} ${novuPath}`;
}

/** Api key when the handler declares Swagger security, plus keyless when the handler allows it. */
export function classifyHandlerAuth(metatype: object, handler: object): AgentInboxRouteAuth {
  const secured = hasSwaggerSecurity(handler) || hasSwaggerSecurity(metatype);
  if (!secured) {
    return 'public';
  }

  if (Reflect.getMetadata(KEYLESS_ACCESSIBLE, handler) === true) {
    return 'apiKeyOrKeyless';
  }

  return 'apiKey';
}

function findHandler(
  modules: ModulesContainer,
  versioning: VersioningOptions | undefined,
  route: Pick<AgentInboxRoute, 'method' | 'novuPath'>
): HandlerMatch {
  const matches = handlersFor(modules, versioning, route);
  if (matches.length === 0) {
    throw new Error(`Agent Inbox route ${route.method.toUpperCase()} ${route.novuPath} has no Nest handler`);
  }

  matches.sort((left, right) => right.score - left.score);
  const best = matches[0];
  const tied = matches.filter((match) => match.score === best.score);
  if (tied.length > 1) {
    throw new Error(
      `Agent Inbox route ${route.method.toUpperCase()} ${route.novuPath} matches ${tied.length} Nest handlers`
    );
  }

  return best;
}

function handlersFor(
  modules: ModulesContainer,
  versioning: VersioningOptions | undefined,
  route: Pick<AgentInboxRoute, 'method' | 'novuPath'>
): HandlerMatch[] {
  const matches: HandlerMatch[] = [];
  for (const moduleRef of modules.values()) {
    for (const controller of moduleRef.controllers.values()) {
      matches.push(...handlerMatches(controller.metatype as ControllerType | undefined, versioning, route));
    }
  }

  return matches;
}

function handlerMatches(
  metatype: ControllerType | undefined,
  versioning: VersioningOptions | undefined,
  route: Pick<AgentInboxRoute, 'method' | 'novuPath'>
): HandlerMatch[] {
  if (!metatype?.prototype) {
    return [];
  }

  const matches: HandlerMatch[] = [];
  for (const methodName of Object.getOwnPropertyNames(metatype.prototype)) {
    const match = matchHandler(metatype, methodName, versioning, route);
    if (match) {
      matches.push(match);
    }
  }

  return matches;
}

function matchHandler(
  metatype: ControllerType,
  methodName: string,
  versioning: VersioningOptions | undefined,
  route: Pick<AgentInboxRoute, 'method' | 'novuPath'>
): HandlerMatch | undefined {
  const handler = metatype.prototype[methodName];
  if (methodName === 'constructor' || typeof handler !== 'function' || httpMethodOf(handler) !== route.method) {
    return undefined;
  }

  let best: HandlerMatch | undefined;
  for (const handlerPath of handlerPaths(metatype, handler, versioning)) {
    const score = pathMatchScore(handlerPath, route.novuPath);
    if (score === null || (best && score <= best.score)) {
      continue;
    }

    best = { metatype, handler, auth: classifyHandlerAuth(metatype, handler), score };
  }

  return best;
}

function handlerPaths(metatype: ControllerType, handler: Handler, versioning: VersioningOptions | undefined): string[] {
  const controllerPath = pathOf(metatype);
  const methodPath = pathOf(handler);
  const base = joinPath(controllerPath, methodPath);
  const versions = routeVersions(metatype, handler, versioning);
  if (versions.length === 0) {
    return [base];
  }

  return versions.map((version) => joinPath('/', version, base));
}

function routeVersions(
  metatype: ControllerType,
  handler: Handler,
  versioning: VersioningOptions | undefined
): string[] {
  if (versioning?.type !== VersioningType.URI) {
    return [];
  }

  const version =
    Reflect.getMetadata(VERSION_METADATA, handler) ??
    Reflect.getMetadata(VERSION_METADATA, metatype) ??
    versioning.defaultVersion;
  if (!version || version === VERSION_NEUTRAL) {
    return [];
  }

  const versions = Array.isArray(version) ? version : [version];
  const prefix = versioning.prefix ?? 'v';

  return versions.filter((item) => item !== VERSION_NEUTRAL).map((item) => `${prefix}${String(item)}`);
}

function pathOf(target: object): string {
  const path = Reflect.getMetadata(PATH_METADATA, target);

  return typeof path === 'string' ? path : '';
}

function httpMethodOf(handler: Handler): AgentInboxHttpMethod | undefined {
  const method = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
  switch (method) {
    case RequestMethod.GET:
      return 'get';
    case RequestMethod.POST:
      return 'post';
    case RequestMethod.PUT:
      return 'put';
    case RequestMethod.PATCH:
      return 'patch';
    case RequestMethod.DELETE:
      return 'delete';
    default:
      return undefined;
  }
}

function hasSwaggerSecurity(target: object): boolean {
  const security = Reflect.getMetadata(API_SECURITY, target) as unknown;

  return Array.isArray(security) && security.length > 0;
}

function joinPath(...parts: string[]): string {
  const segments = parts.flatMap((part) => part.split('/')).filter((segment) => segment.length > 0);

  return `/${segments.join('/')}`;
}
