import { RequestEvent } from '@sveltejs/kit';
import { EchoRequestHandler, ServeHandlerOptions } from './handler';
import { type SupportedFrameworkName } from './types';

export const frameworkName: SupportedFrameworkName = 'sveltekit';

export const serve = (options: ServeHandlerOptions): any => {
  const echoHandler = new EchoRequestHandler({
    frameworkName,
    ...options,
    handler: (incomingRequest: RequestEvent, response: Response) => ({
      body: () => incomingRequest.request.body,
      headers: (key) => {
        const header = incomingRequest.request.headers[key];

        return Array.isArray(header) ? header[0] : header;
      },
      method: () => incomingRequest.request.method || 'GET',
      url: () => incomingRequest.url,
      queryString: (key) => {
        const qs = incomingRequest.url.searchParams.get(key);

        return Array.isArray(qs) ? qs[0] : qs;
      },
      transformResponse: ({ body, headers, status }) => {
        return new Response(JSON.stringify(body), {
          status,
          headers,
        });
      },
    }),
  });

  return echoHandler.createHandler();
};
