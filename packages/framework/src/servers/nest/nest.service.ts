import { type VercelRequest, type VercelResponse } from '@vercel/node';
import { Injectable, Inject } from '@nestjs/common';
import type { Request, Response } from 'express';

import { type INovuRequestHandlerOptions, NovuRequestHandler, type ServeHandlerOptions } from '../../handler';
import type { Either, SupportedFrameworkName } from '../../types';
import { SERVE_HANDLER_OPTIONS } from './nest.constants';

export const frameworkName: SupportedFrameworkName = 'nest';

@Injectable()
export class NovuService {
  public novuHandler: NovuRequestHandler;

  constructor(@Inject(SERVE_HANDLER_OPTIONS) private options: ServeHandlerOptions) {
    this.novuHandler = new NovuRequestHandler({
      frameworkName,
      ...this.options,
      handler: this.handler.bind(this),
    });
  }

  private handler(
    incomingRequest: Either<VercelRequest, Request>,
    response: Either<Response, VercelResponse>
  ): ReturnType<INovuRequestHandlerOptions['handler']> {
    const extractHeader = (key: string): string | null | undefined => {
      const header = incomingRequest.headers[key.toLowerCase()];

      return Array.isArray(header) ? header[0] : header;
    };

    return {
      body: () => incomingRequest.body,
      headers: extractHeader,
      method: () => incomingRequest.method || 'GET',
      queryString: (key) => {
        const qs = incomingRequest.query[key];

        return Array.isArray(qs) ? qs[0] : qs;
      },
      url: () => {
        // `req.hostname` can filter out port numbers; beware!
        const hostname = incomingRequest.headers.host || '';

        const protocol = hostname?.includes('://') ? '' : `${incomingRequest.protocol || 'https'}://`;

        const url = new URL(incomingRequest.originalUrl || incomingRequest.url || '', `${protocol}${hostname || ''}`);

        return url;
      },
      transformResponse: ({ body, headers, status }) => {
        Object.entries(headers).forEach(([headerName, headerValue]) => {
          response.setHeader(headerName, headerValue as string);
        });

        return response.status(status).send(body);
      },
    };
  }

  public async handleRequest(req: Request, res: Response) {
    await this.novuHandler.createHandler()(req, res);
  }
}
