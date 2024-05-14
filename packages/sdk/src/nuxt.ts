// eslint-disable-next-line import/no-extraneous-dependencies
import { getHeader, getQuery, H3Event, readBody, send, setHeaders } from 'h3';

import { EchoRequestHandler, IServeHandlerOptions } from './handler';
import { type SupportedFrameworkName } from './types';

export const frameworkName: SupportedFrameworkName = 'nuxt';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const serve = (options: IServeHandlerOptions) => {
  const handler = new EchoRequestHandler({
    frameworkName,
    ...options,
    handler: (event: H3Event) => ({
      queryString: (key) => String(getQuery(event)[key]),
      body: () => readBody(event),
      headers: (key) => getHeader(event, key),
      url: () =>
        new URL(
          String(event.path),
          `${process.env.NODE_ENV === 'development' ? 'http' : 'https'}://${String(getHeader(event, 'host'))}`
        ),
      method: () => event.method,
      transformResponse: (actionRes) => {
        const { res } = event.node;

        res.statusCode = actionRes.status;
        setHeaders(event, actionRes.headers);

        return send(event, actionRes.body);
      },
    }),
  });

  return handler.createHandler();
};
