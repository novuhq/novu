import type { IncomingMessage, ServerResponse } from 'node:http';
import { PinoLogger } from '@novu/application-generic';
import { ApiAuthSchemeEnum, NONE_AUTH_SCHEME } from '@novu/shared';
import { normalizeRoutePath } from '../../auth/api-key-revocation/api-key-revocation.policy';
import { addNewRelicRequestAttributes } from '../../auth/services/passport/newrelic.util';
import { getClientIp } from '../utils/client-ip';

/** The request as the guards leave it: the session on `user`, and the first word of `Authorization` on `authScheme`. */
type AccessLogRequest = IncomingMessage & {
  authScheme?: string;
  route?: { path?: unknown };
  user?: {
    _id?: string;
    organizationId?: string;
    environmentId?: string;
    subscriberId?: string;
    scheme?: string;
  };
};

export const ACCESS_LOG_MESSAGE = 'request completed';

const API_KEY_HEADER_PREFIX = `${ApiAuthSchemeEnum.API_KEY} `;
const KNOWN_AUTH_SCHEMES: ReadonlySet<string> = new Set([...Object.values(ApiAuthSchemeEnum), NONE_AUTH_SCHEME]);
const UNKNOWN_AUTH_SCHEME = 'unknown';
const MAX_HEADER_LENGTH = 256;
const MIN_API_KEY_LENGTH = 16;
// Every value the environment validation reads as false.
const DISABLED_VALUES: ReadonlySet<string> = new Set(['false', 'f', 'no', 'off', '0']);

/*
 * Requests that get no access line, all of which still get the New Relic attributes. The socket service's presence
 * calls say nothing about a caller. A trigger and every Inbox and widget call run once per notification or per Inbox
 * render, and the worker calls the bridge of a dashboard workflow once per subscriber and step, so a line per call
 * would be most of the API's traffic. Cancelling a trigger and a broadcast are rare and keep their line.
 */
const REQUESTS_WITHOUT_ACCESS_LOG: ReadonlySet<string> = new Set([
  'POST /v1/internal/subscriber-online-state',
  'POST /v1/events/trigger',
  'POST /v1/events/trigger/bulk',
  'POST /v1/environments/:environmentId/bridge',
]);
const ROUTE_PREFIXES_WITHOUT_ACCESS_LOG: readonly string[] = ['/v1/inbox/', '/v1/widgets/'];

/*
 * Load balancer and uptime probes, which the middleware leaves alone: no line and no New Relic attributes. They name
 * no caller, and Terminus logs a failed check itself.
 */
const HEALTH_CHECK_PATH = '/v1/health-check';

/**
 * What one access line says about a request: who called which route, from where, and how it ended. Only the fields
 * listed here are logged. The path, query string, body and every other header stay out, because they carry tokens,
 * signatures and subscriber ids.
 */
export function buildAccessLog(
  req: AccessLogRequest,
  res: ServerResponse,
  { clientIp, responseTime }: { clientIp: string | undefined; responseTime: number }
) {
  const { user } = req;
  const authScheme = req.authScheme ?? user?.scheme;

  return {
    method: req.method,
    route: getRoute(req),
    statusCode: res.statusCode,
    responseTime,
    // The caller hung up before the response went out, so the status code is not what they saw.
    aborted: res.writableEnded ? undefined : true,
    clientIp,
    cfRay: getHeader(req, 'cf-ray'),
    country: getHeader(req, 'cf-ipcountry'),
    userAgent: getHeader(req, 'user-agent'),
    origin: getHeader(req, 'origin'),
    // Joins this line to a retried call, the caller's Sentry span, and the AWS load balancer trace.
    idempotencyKey: getHeader(req, 'idempotency-key'),
    sentryTrace: getHeader(req, 'sentry-trace'),
    amznTraceId: getHeader(req, 'x-amzn-trace-id'),
    // The guards keep the first word of the header, which is the whole key when a client leaves out `ApiKey `.
    authScheme: authScheme && (KNOWN_AUTH_SCHEMES.has(authScheme) ? authScheme : UNKNOWN_AUTH_SCHEME),
    organizationId: user?.organizationId,
    environmentId: user?.environmentId || undefined,
    // On an Inbox session `_id` is a subscriber.
    userId: user?.subscriberId ? undefined : user?._id,
    apiKeyLast4: getApiKeyLast4(req),
  };
}

/**
 * Writes one access line per request when the response closes, whatever its status, and marks the request's New Relic
 * transaction with its caller. A middleware and not an interceptor, because interceptors never run when a guard
 * rejects the request or no route matches.
 *
 * The line goes to the root logger. The request logger would add the `req` object, which holds every header except
 * `authorization`, and the query string.
 */
export function accessLogMiddleware(req: AccessLogRequest, res: ServerResponse, next: () => void) {
  if (isHealthCheck(req)) {
    next();

    return;
  }

  const startedAt = Date.now();
  // Read once, now: the signature on an Agent Inbox visitor's IP can be too old by the time a long response closes.
  const clientIp = getClientIp(req);

  // Added now because the transaction may be over when the response closes.
  addNewRelicRequestAttributes({
    clientIp,
    country: getHeader(req, 'cf-ipcountry'),
    apiKeyLast4: getApiKeyLast4(req),
  });

  res.once('close', () => {
    try {
      if (DISABLED_VALUES.has(process.env.IS_API_ACCESS_LOG_ENABLED ?? '') || !hasAccessLog(req)) {
        return;
      }

      PinoLogger.root.info(
        buildAccessLog(req, res, { clientIp, responseTime: Date.now() - startedAt }),
        ACCESS_LOG_MESSAGE
      );
    } catch {
      // swallow – an error thrown from this listener would take the process down
    }
  });

  next();
}

/** The matched route pattern, such as `/v1/environments/:environmentId`, never the path that was called. */
function getRoute(req: AccessLogRequest): string | undefined {
  const path = req.route?.path;

  return typeof path === 'string' ? normalizeRoutePath(path) : undefined;
}

/** Decided on the matched route and not on the URL, so no path or query string can hide a request. */
function hasAccessLog(req: AccessLogRequest): boolean {
  const route = getRoute(req);

  if (!route) {
    return true;
  }

  return (
    !REQUESTS_WITHOUT_ACCESS_LOG.has(`${req.method} ${route}`) &&
    !ROUTE_PREFIXES_WITHOUT_ACCESS_LOG.some((prefix) => route.startsWith(prefix))
  );
}

/**
 * Decided on the path, because no route is matched yet when the request arrives. Only a GET or HEAD on that path
 * matches (Express answers HEAD with the GET handler), with or without the API context path in front.
 */
function isHealthCheck(req: AccessLogRequest): boolean {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return false;
  }

  const path = req.url?.split('?')[0];

  return path !== undefined && normalizeRoutePath(path) === HEALTH_CHECK_PATH;
}

/** A header value, cut short because the caller writes it. */
function getHeader(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];

  return typeof value === 'string' ? value.slice(0, MAX_HEADER_LENGTH) : undefined;
}

/**
 * The ending of the secret key the request was sent with, the way the API Keys page shows a key. Read from the
 * header and not from the session, so a rejected key is identified too. Nothing for a value too short to be a key,
 * which its last characters would mostly give away.
 */
function getApiKeyLast4(req: IncomingMessage): string | undefined {
  const { authorization } = req.headers;

  if (typeof authorization !== 'string' || !authorization.startsWith(API_KEY_HEADER_PREFIX)) {
    return undefined;
  }

  const apiKey = authorization.slice(API_KEY_HEADER_PREFIX.length);

  return apiKey.length >= MIN_API_KEY_LENGTH ? apiKey.slice(-4) : undefined;
}
