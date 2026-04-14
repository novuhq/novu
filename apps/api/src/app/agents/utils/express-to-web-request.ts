import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

/**
 * Converts an Express Request to a Web API Request.
 * Uses req.rawBody (Buffer) when available for signature verification integrity.
 * Falls back to re-serializing req.body if rawBody is not present.
 */
export function toWebRequest(req: ExpressRequest): Request {
  const protocol = req.protocol;
  const host = req.get('host') || 'localhost';
  const url = `${protocol}://${host}${req.originalUrl}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        headers.append(key, v);
      }
    } else {
      headers.set(key, value);
    }
  }

  let body: BodyInit | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const rawBody = (req as ExpressRequest & { rawBody?: Buffer }).rawBody;
    if (rawBody) {
      body = rawBody;
    } else if (Buffer.isBuffer(req.body) || typeof req.body === 'string') {
      body = req.body;
    } else if (req.body !== undefined) {
      body = JSON.stringify(req.body);
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
    }
  }

  return new Request(url, {
    method: req.method,
    headers,
    body,
  });
}

/**
 * Writes a Web API Response back onto an Express Response.
 */
export async function sendWebResponse(webResponse: Response, res: ExpressResponse): Promise<void> {
  res.status(webResponse.status);

  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const contentType = webResponse.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await webResponse.json();
    res.json(json);
  } else {
    const text = await webResponse.text();
    res.send(text);
  }
}
