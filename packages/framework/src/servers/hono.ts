import { type Context } from 'hono';

import { NovuRequestHandler, type ServeHandlerOptions } from '../handler';
import { type SupportedFrameworkName } from '../types';
import { getResponse } from '../utils';

/*
 * Re-export all top level exports from the main package.
 * This results in better DX reduces the chances of the dual package hazard for ESM + CJS packages.
 *
 * Example:
 *
 * import { serve, Client, type Workflow } from '@novu/framework/hono';
 *
 * instead of
 *
 * import { serve } from '@novu/framework/hono';
 * import { Client, type Workflow } from '@novu/framework';
 */
export * from '../index';
export const frameworkName: SupportedFrameworkName = 'hono';

/**
 * Using Hono, serve and register any declared workflows with Novu,
 * making them available to be triggered by events.
 *
 * On Cloudflare Workers, background agent turns are kept alive after the
 * acknowledgement response via the execution context's `waitUntil`, so agents
 * work without extra configuration.
 *
 * @example
 * ```ts
 * import { Hono } from "hono";
 * import { serve } from "@novu/framework/hono";
 * import { myWorkflow } from "./src/novu/workflows";
 *
 * const app = new Hono();
 *
 * app.on(
 *   ["GET", "POST", "OPTIONS"],
 *   "/api/novu",
 *   serve({ workflows: [myWorkflow] })
 * );
 *
 * export default app;
 * ```
 *
 * @public
 */
/**
 * On Cloudflare Workers, the execution context's `waitUntil` extends the
 * invocation lifetime so background agent turns complete after the
 * acknowledgement response is sent.
 *
 * Accessing `c.executionCtx` throws on runtimes without an execution context
 * (e.g. Node.js, Bun, Deno). Returning `undefined` there — instead of a no-op
 * callback — lets the core handler surface its freeze-prone runtime warning
 * (e.g. Hono on AWS Lambda) rather than masking the missing primitive.
 */
const getExecutionCtxWaitUntil = (c: Context): ((promise: Promise<unknown>) => void) | undefined => {
  try {
    const executionCtx = c.executionCtx;

    if (typeof executionCtx.waitUntil === 'function') {
      return (promise) => executionCtx.waitUntil(promise);
    }
  } catch {
    // No execution context available.
  }

  return undefined;
};

export const serve = (options: ServeHandlerOptions): ((c: Context) => Promise<Response>) => {
  const handler = new NovuRequestHandler({
    frameworkName,
    ...options,
    handler: (c: Context) => {
      return {
        body: () => c.req.json(),
        waitUntil: getExecutionCtxWaitUntil(c),
        headers: (key) => c.req.header(key),
        method: () => c.req.method,
        queryString: (key) => c.req.query(key),
        url: () => {
          try {
            return new URL(c.req.url);
          } catch {
            // no-op when url is relative
          }

          const host = c.req.header('host') || 'localhost';
          let protocol: 'http' | 'https' = 'https';

          try {
            // biome-ignore lint/suspicious/noExplicitAny: Needed for some edge cases
            if (process.env.NODE_ENV === 'development' || (process.env.NODE_ENV as any) === 'dev') {
              protocol = 'http';
            }
          } catch {
            // no-op when process is unavailable (edge runtimes)
          }

          return new URL(c.req.url, `${protocol}://${host}`);
        },
        transformResponse: ({ body, status, headers }): Response => {
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
