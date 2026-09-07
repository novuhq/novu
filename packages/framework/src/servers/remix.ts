import { NovuRequestHandler, type ServeHandlerOptions } from '../handler';
import { type SupportedFrameworkName } from '../types';
import { getResponse } from '../utils';

/*
 * Re-export all top level exports from the main package.
 * This results in better DX reduces the chances of the dual package hazard for ESM + CJS packages.
 *
 * Example:
 *
 * import { serve, Client, type Workflow } from '@novu/framework/remix';
 *
 * instead of
 *
 * import { serve } from '@novu/framework/remix';
 * import { Client, type Workflow } from '@novu/framework';
 */
export * from '../index';
export const frameworkName: SupportedFrameworkName = 'remix';

/**
 * In Remix, serve and register any declared workflows with Novu, making them
 * available to be triggered by events.
 *
 * Remix requires that you export both a "loader" for serving `GET` requests,
 * and an "action" for serving other requests, therefore exporting both is
 * required.
 *
 * See {@link https://remix.run/docs/en/v1/guides/resource-routes}
 *
 * @example
 * ```ts
 * import { serve } from "@novu/framework/remix";
 * import { myWorkflow } from "./src/novu/workflows";
 *
 * const handler = serve({ workflows: [myWorkflow] });
 *
 * export { handler as loader, handler as action };
 * ```
 */
// Has explicit return type to avoid JSR-defined "slow types"
export const serve = (
  options: ServeHandlerOptions
): ((ctx: { request: Request; context?: unknown }) => Promise<Response>) => {
  const handler = new NovuRequestHandler({
    frameworkName,
    ...options,
    handler: ({ request: req }: { request: Request }) => {
      return {
        body: () => req.json(),
        headers: (key) => req.headers.get(key),
        method: () => req.method,
        url: () => new URL(req.url, `https://${req.headers.get('host') || ''}`),
        transformResponse: ({ body, status, headers }): Response => {
          // Handle Response polyfills
          const Res = getResponse();

          return new Res(body, {
            status,
            headers,
          });
        },
      };
    },
  });

  return handler.createHandler();
};
