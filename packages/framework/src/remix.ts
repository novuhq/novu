import { NovuRequestHandler, ServeHandlerOptions } from './handler';
import { type SupportedFrameworkName } from './types';

export const frameworkName: SupportedFrameworkName = 'remix';

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
          // eslint-disable-next-line @typescript-eslint/naming-convention
          let Res: typeof Response;

          if (typeof Response === 'undefined') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
            Res = require('cross-fetch').Response;
          } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            Res = Response;
          }

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
