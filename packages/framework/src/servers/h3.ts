import { getHeader, getQuery, type H3Event, readBody, send, setHeaders, type EventHandlerRequest } from 'h3';

import { NovuRequestHandler, type ServeHandlerOptions } from '../handler';
import { type SupportedFrameworkName } from '../types';

/*
 * Re-export all top level exports from the main package.
 * This results in better DX reduces the chances of the dual package hazard for ESM + CJS packages.
 *
 * Example:
 *
 * import { serve, Client, type Workflow } from '@novu/framework/h3';
 *
 * instead of
 *
 * import { serve } from '@novu/framework/h3';
 * import { Client, type Workflow } from '@novu/framework';
 */
export * from '../index';
export const frameworkName: SupportedFrameworkName = 'h3';

/**
 * In h3, serve and register any declared workflows with Novu, making
 * them available to be triggered by events.
 *
 * @example
 * ```ts
 * import { createApp, eventHandler, toNodeListener } from "h3";
 * import { serve } from "@novu/framework/h3";
 * import { createServer } from "node:http";
 * import { myWorkflow } from "./src/novu/workflows";
 *
 * const app = createApp();
 * app.use(
 *   "/api/novu",
 *   eventHandler(
 *     serve({
 *       workflows: [myWorkflow],
 *     })
 *   )
 * );
 *
 * createServer(toNodeListener(app)).listen(process.env.PORT || 4000);
 * ```
 *
 * @public
 */
export const serve = (options: ServeHandlerOptions) => {
  const handler = new NovuRequestHandler({
    frameworkName,
    ...options,
    handler: (event: H3Event<EventHandlerRequest>) => {
      return {
        body: () => readBody(event),
        headers: (key) => getHeader(event, key),
        method: () => event.method,
        url: () =>
          new URL(
            String(event.path),
            `${process.env.NODE_ENV === 'development' ? 'http' : 'https'}://${String(getHeader(event, 'host'))}`
          ),
        queryString: (key) => String(getQuery(event)[key]),
        transformResponse: (actionRes) => {
          const { res } = event.node;
          res.statusCode = actionRes.status;
          setHeaders(event, actionRes.headers);

          return send(event, actionRes.body);
        },
      };
    },
  });

  return handler.createHandler();
};
