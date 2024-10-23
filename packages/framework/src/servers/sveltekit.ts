import { RequestEvent } from '@sveltejs/kit';
import { NovuRequestHandler, type ServeHandlerOptions } from '../handler';
import { type SupportedFrameworkName } from '../types';
import { getResponse } from '../utils';

/*
 * Re-export all top level exports from the main package.
 * This results in better DX reduces the chances of the dual package hazard for ESM + CJS packages.
 *
 * Example:
 *
 * import { serve, Client, type Workflow } from '@novu/framework/sveltekit';
 *
 * instead of
 *
 * import { serve } from '@novu/framework/sveltekit';
 * import { Client, type Workflow } from '@novu/framework';
 */
export * from '../index';
export const frameworkName: SupportedFrameworkName = 'sveltekit';

/**
 * Using SvelteKit, serve and register any declared workflows with Novu,
 * making them available to be triggered by events.
 *
 * @example
 * ```ts
 * // app/routes/api/novu/+server.ts
 * import { serve } from "@novu/framework/sveltekit";
 * import { myWorkflow } from "./src/novu/workflows"; // Your workflows
 *
 * const handler = serve({ workflows: [myWorkflow] });
 *
 * export { handler as action, handler as loader };
 * ```
 */
export const serve = (
  options: ServeHandlerOptions
): ((event: RequestEvent) => Promise<Response>) & {
  GET: (event: RequestEvent) => Promise<Response>;
  POST: (event: RequestEvent) => Promise<Response>;
  OPTIONS: (event: RequestEvent) => Promise<Response>;
} => {
  const handler = new NovuRequestHandler({
    frameworkName,
    ...options,
    handler: (reqMethod: 'GET' | 'POST' | 'OPTIONS' | undefined, event: RequestEvent) => {
      return {
        method: () => reqMethod || event.request.method || '',
        body: () => event.request.json(),
        headers: (key) => event.request.headers.get(key),
        url: () => {
          const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';

          return new URL(event.request.url, `${protocol}://${event.request.headers.get('host') || ''}`);
        },
        transformResponse: ({ body, headers, status }) => {
          // Handle Response polyfills
          const Res = getResponse();

          return new Res(body, { status, headers });
        },
      };
    },
  });

  const baseFn = handler.createHandler();

  const fn = baseFn.bind(null, undefined);
  type Fn = typeof fn;

  const handlerFn = Object.defineProperties(fn, {
    GET: { value: baseFn.bind(null, 'GET') },
    POST: { value: baseFn.bind(null, 'POST') },
    OPTIONS: { value: baseFn.bind(null, 'OPTIONS') },
  }) as Fn & {
    GET: Fn;
    POST: Fn;
    OPTIONS: Fn;
  };

  return handlerFn;
};
