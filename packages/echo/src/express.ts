import { type VercelRequest, type VercelResponse } from '@vercel/node';
import { type Request, type Response } from 'express';

import { EchoRequestHandler, IServeHandlerOptions } from './handler';
import { Either } from './types';
import { type SupportedFrameworkName } from './types';

export const frameworkName: SupportedFrameworkName = 'express';

export const serve = (options: IServeHandlerOptions): any => {
  const echoHandler = new EchoRequestHandler({
    frameworkName,
    ...options,
    handler: (incomingRequest: Either<VercelRequest, Request>, response: Either<Response, VercelResponse>) => ({
      body: () => incomingRequest.body,
      headers: (key) => {
        const header = incomingRequest.headers[key];

        return Array.isArray(header) ? header[0] : header;
      },
      method: () => incomingRequest.method || 'GET',
      url: () => {
        // `req.hostname` can filter out port numbers; beware!
        const hostname = incomingRequest.headers.host || '';

        const protocol = hostname?.includes('://') ? '' : `${incomingRequest.protocol || 'https'}://`;

        const url = new URL(incomingRequest.originalUrl || incomingRequest.url || '', `${protocol}${hostname || ''}`);

        return url;
      },
      queryString: (key) => {
        const qs = incomingRequest.query[key];

        return Array.isArray(qs) ? qs[0] : qs;
      },
      transformResponse: ({ body, headers, status }) => {
        Object.entries(headers).forEach(([headerName, headerValue]) => {
          response.setHeader(headerName, headerValue);
        });

        return response.status(status).send(body);
      },
    }),
  });

  return echoHandler.createHandler();
};
