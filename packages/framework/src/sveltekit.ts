import { RequestEvent } from '@sveltejs/kit';
import { NovuRequestHandler, ServeHandlerOptions } from './handler';
import { type SupportedFrameworkName } from './types';

export const frameworkName: SupportedFrameworkName = 'sveltekit';

export const serve = (
  options: ServeHandlerOptions
): ((event: RequestEvent) => Promise<Response>) & {
  GET: (event: RequestEvent) => Promise<Response>;
  POST: (event: RequestEvent) => Promise<Response>;
  PUT: (event: RequestEvent) => Promise<Response>;
} => {
  const handler = new NovuRequestHandler({
    frameworkName,
    ...options,
    handler: (reqMethod: 'GET' | 'POST' | 'PUT' | undefined, event: RequestEvent) => {
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
          // eslint-disable-next-line @typescript-eslint/naming-convention
          let Res: typeof Response;

          if (typeof Response === 'undefined') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
            Res = require('cross-fetch').Response;
          } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            Res = Response;
          }

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
    PUT: { value: baseFn.bind(null, 'PUT') },
  }) as Fn & {
    GET: Fn;
    POST: Fn;
    PUT: Fn;
  };

  return handlerFn;
};
