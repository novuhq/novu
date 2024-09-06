import type { Request, Response } from 'express';
import { NovuRequestHandler, ServeHandlerOptions, Either, SupportedFrameworkName } from '@novu/framework';

export const frameworkName = 'nestjs';

export class NovuNestjsHandler {
  private novuHandler: NovuRequestHandler;

  constructor(options: ServeHandlerOptions) {
    this.novuHandler = new NovuRequestHandler({
      frameworkName,
      ...options,
      handler: this.handler.bind(this),
    });
  }

  private handler(requestMethod: 'GET' | 'POST' | 'OPTIONS' | undefined, incomingRequest: Request, response: Response) {
    const request = incomingRequest as Either<Request, Request>;

    const extractHeader = (key: string): string | null | undefined => {
      const header = request.headers[key.toLowerCase()];

      return Array.isArray(header) ? header[0] : header;
    };

    return {
      body: () => request.body,
      headers: extractHeader,
      method: () => requestMethod || request.method || '',
      queryString: (key, url) => {
        const qs = request.query?.[key] || url.searchParams.get(key);

        return Array.isArray(qs) ? qs[0] : qs;
      },
      url: () => {
        let absoluteUrl: URL | undefined;
        try {
          absoluteUrl = new URL(request.url as string);
        } catch {
          // no-op
        }

        if (absoluteUrl) {
          const host = extractHeader('host');
          if (host) {
            const hostWithProtocol = new URL(host.includes('://') ? host : `${absoluteUrl.protocol}//${host}`);

            absoluteUrl.protocol = hostWithProtocol.protocol;
            absoluteUrl.host = hostWithProtocol.host;
            absoluteUrl.port = hostWithProtocol.port;
            absoluteUrl.username = hostWithProtocol.username;
            absoluteUrl.password = hostWithProtocol.password;
          }

          return absoluteUrl;
        }

        let protocol: 'http' | 'https' = 'https';
        const hostHeader = extractHeader('host') || '';

        try {
          if (process.env.NODE_ENV === 'dev') {
            protocol = 'http';
          }
        } catch (error) {
          // no-op
        }

        const url = new URL(request.url as string, `${protocol}://${hostHeader}`);

        return url;
      },
      transformResponse: ({ body, headers, status }): Response => {
        Object.entries(headers).forEach(([headerName, headerValue]) => {
          response.setHeader(headerName, headerValue as string);
        });

        response.status(status).send(body);

        return undefined as unknown as Response;
      },
    };
  }

  async handleRequest(req: Request, res: Response, method: 'GET' | 'POST' | 'OPTIONS') {
    await this.novuHandler.createHandler()(method, req, res);
  }
}
