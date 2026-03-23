import { validateHmacSignature } from './auth/hmac';
import type { Env } from './types';
import { generateStepResolverWorkerId } from './utils/worker-id';

const AUTH_HEADERS_TO_REMOVE = ['x-novu-signature', 'authorization', 'x-internal-auth'];
const RESOLVE_ROUTE_REGEX =
  /^\/resolve\/(?<organizationId>[a-f0-9]{24})\/(?<stepResolverWorkerHash>sr-[^/]+)\/(?<workflowId>[^/]+)\/(?<stepId>[^/]+)$/;
const REQUEST_ID_HEADER = 'x-request-id';
const JSON_CONTENT_TYPE = 'application/json';
const MAX_REQUEST_BODY_BYTES = 1024 * 1024; // 1MB

function jsonResponse(body: unknown, status: number, requestId: string, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      [REQUEST_ID_HEADER]: requestId,
      ...headers,
    },
  });
}

function methodNotAllowed(allow: string, requestId: string): Response {
  return jsonResponse(
    {
      error: 'Method not allowed',
    },
    405,
    requestId,
    { Allow: allow }
  );
}

function decodePathParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error('Invalid path parameter encoding');
  }
}

function stripAuthHeaders(headers: Headers): Headers {
  const sanitizedHeaders = new Headers(headers);
  for (const headerName of AUTH_HEADERS_TO_REMOVE) {
    sanitizedHeaders.delete(headerName);
  }
  return sanitizedHeaders;
}

function getRequestId(request: Request): string {
  return request.headers.get(REQUEST_ID_HEADER) || request.headers.get('cf-ray') || crypto.randomUUID();
}

function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) {
    return false;
  }

  return contentType.split(';', 1)[0].trim().toLowerCase() === JSON_CONTENT_TYPE;
}

function parseContentLength(contentLengthHeader: string | null): number | undefined {
  if (!contentLengthHeader) {
    return undefined;
  }

  const contentLength = Number(contentLengthHeader);
  return Number.isFinite(contentLength) ? contentLength : Number.NaN;
}

function logInfo(message: string, context: Record<string, unknown>): void {
  console.info(JSON.stringify({ level: 'info', message, ...context }));
}

function logWarn(message: string, context: Record<string, unknown>): void {
  console.warn(JSON.stringify({ level: 'warn', message, ...context }));
}

function logError(message: string, context: Record<string, unknown>): void {
  console.error(JSON.stringify({ level: 'error', message, ...context }));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const requestId = getRequestId(request);
    const startedAt = Date.now();

    if (url.pathname === '/health') {
      if (request.method !== 'GET') {
        return methodNotAllowed('GET', requestId);
      }

      return jsonResponse({ status: 'healthy', timestamp: new Date().toISOString() }, 200, requestId);
    }

    const resolveMatch = url.pathname.match(RESOLVE_ROUTE_REGEX);
    if (!resolveMatch) {
      logWarn('Route not found', { requestId, path: url.pathname, method: request.method });
      return jsonResponse({ error: 'Not found' }, 404, requestId);
    }

    // groups are always present when the regex matches since all captures are named
    const {
      organizationId,
      stepResolverWorkerHash,
      workflowId: rawWorkflowId,
      stepId: rawStepId,
    } = resolveMatch.groups as Record<string, string>;
    const stepResolverHash = stepResolverWorkerHash.slice(3); // strip 'sr-' prefix

    if (request.method !== 'POST') {
      return methodNotAllowed('POST', requestId);
    }

    if (!isJsonContentType(request.headers.get('content-type'))) {
      return jsonResponse(
        {
          error: 'Unsupported media type',
          message: `Expected ${JSON_CONTENT_TYPE} content type`,
        },
        415,
        requestId
      );
    }

    const declaredContentLength = parseContentLength(request.headers.get('content-length'));
    if (Number.isNaN(declaredContentLength)) {
      return jsonResponse({ error: 'Invalid Content-Length header' }, 400, requestId);
    }

    if (declaredContentLength !== undefined && declaredContentLength > MAX_REQUEST_BODY_BYTES) {
      return jsonResponse(
        { error: 'Payload too large', message: `Maximum allowed body size is ${MAX_REQUEST_BODY_BYTES} bytes` },
        413,
        requestId
      );
    }

    if (!env.STEP_RESOLVER_HMAC_SECRET) {
      logError('Dispatch worker configuration missing HMAC secret', {
        requestId,
        organizationId,
        stepResolverHash,
        rawWorkflowId,
        rawStepId,
      });
      return jsonResponse({ error: 'Server configuration error' }, 500, requestId);
    }

    const bodyBytes = new Uint8Array(await request.arrayBuffer());
    if (bodyBytes.byteLength > MAX_REQUEST_BODY_BYTES) {
      return jsonResponse(
        { error: 'Payload too large', message: `Maximum allowed body size is ${MAX_REQUEST_BODY_BYTES} bytes` },
        413,
        requestId
      );
    }

    const signatureHeader = request.headers.get('X-Novu-Signature');
    if (!signatureHeader) {
      logWarn('Missing HMAC signature header', {
        requestId,
        organizationId,
        stepResolverHash,
        rawWorkflowId,
        rawStepId,
      });
      return jsonResponse({ error: 'Unauthorized', message: 'Missing signature' }, 401, requestId);
    }

    const bodyString = new TextDecoder().decode(bodyBytes);

    const hmacValidation = await validateHmacSignature(signatureHeader, env.STEP_RESOLVER_HMAC_SECRET, bodyString);

    if (!hmacValidation.valid) {
      logWarn('Rejected request due to invalid HMAC signature', {
        requestId,
        organizationId,
        stepResolverHash,
        rawWorkflowId,
        rawStepId,
        reason: hmacValidation.error,
      });
      return jsonResponse({ error: 'Unauthorized', message: hmacValidation.error }, 401, requestId);
    }

    let bodyJson: Record<string, unknown>;
    try {
      bodyJson = JSON.parse(bodyString);
    } catch (error) {
      return jsonResponse({ error: 'Invalid JSON', message: 'Request body must be valid JSON' }, 400, requestId);
    }

    let workflowId: string;
    let stepId: string;

    try {
      workflowId = decodePathParam(rawWorkflowId);
      stepId = decodePathParam(rawStepId);
    } catch (error) {
      return jsonResponse(
        {
          error: 'Invalid request path',
          message: error instanceof Error ? error.message : 'Invalid path parameters',
        },
        400,
        requestId
      );
    }

    const workerId = generateStepResolverWorkerId(organizationId, stepResolverHash);
    const workerUrl = new URL(request.url);
    workerUrl.searchParams.set('workflowId', workflowId);
    workerUrl.searchParams.set('stepId', stepId);

    const forwardedRequest = new Request(workerUrl.toString(), {
      method: 'POST',
      headers: stripAuthHeaders(request.headers),
      body: bodyBytes,
    });

    try {
      const workerResponse = await env.DISPATCHER.get(workerId).fetch(forwardedRequest);
      logInfo('Dispatched step resolver request', {
        requestId,
        organizationId,
        stepResolverHash,
        workflowId,
        stepId,
        workerId,
        statusCode: workerResponse.status,
        durationMs: Date.now() - startedAt,
      });

      const responseHeaders = new Headers(workerResponse.headers);
      responseHeaders.set(REQUEST_ID_HEADER, requestId);

      return new Response(workerResponse.body, {
        status: workerResponse.status,
        statusText: workerResponse.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      logError('Failed dispatching request to step resolver worker', {
        requestId,
        organizationId,
        stepResolverHash,
        workflowId,
        stepId,
        workerId,
        error: error instanceof Error ? error.message : 'Unknown dispatch error',
      });

      return jsonResponse(
        {
          error: 'Dispatch error',
          message: 'Internal dispatch error',
          workerId,
        },
        502,
        requestId
      );
    }
  },
};
