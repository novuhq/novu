import { type VercelRequest, type VercelResponse } from '@vercel/node';
import { type Request, type Response } from 'express';

import { NovuRequestHandler, ServeHandlerOptions } from '../handler';
import { Either } from '../types';
import { type SupportedFrameworkName } from '../types';

/*
 * Re-export all top level exports from the main package.
 * This results in better DX reduces the chances of the dual package hazard for ESM + CJS packages.
 *
 * Example:
 *
 * import { serve, Client, type Workflow } from '@novu/framework/express';
 *
 * instead of
 *
 * import { serve } from '@novu/framework/express';
 * import { Client, type Workflow } from '@novu/framework';
 */
export * from '../index';
export const frameworkName: SupportedFrameworkName = 'express';

/**
 * Serve and register any declared workflows with Novu, making them available
 * to be triggered by events.
 *
 * The return type is currently `any` to ensure there's no required type matches
 * between the `express` and `vercel` packages. This may change in the future to
 * appropriately infer.
 *
 * @example
 * ```ts
 * import { serve } from "@novu/framework/express";
 * import { myWorkflow } from "./src/novu/workflows"; // Your workflows
 *
 * // Important:  ensure you add JSON middleware to process incoming JSON POST payloads.
 * app.use(express.json());
 * app.use(
 *   // Expose the middleware on our recommended path at `/api/novu`.
 *   "/api/novu",
 *   serve({ workflows: [myWorkflow] })
 * );
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const serve = (options: ServeHandlerOptions): any => {
  const novuHandler = new NovuRequestHandler({
    frameworkName,
    ...options,
    /*
     * TODO: Fix this
     */
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

  return novuHandler.createHandler();
};
