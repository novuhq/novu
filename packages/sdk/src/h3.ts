import { getHeader, getQuery, type H3Event, readBody, send, setHeaders } from 'h3';

import { EchoRequestHandler, IServeHandlerOptions } from './handler';
import { type SupportedFrameworkName } from './types';

export const frameworkName: SupportedFrameworkName = 'h3';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const serve = (options: IServeHandlerOptions) => {
  const handler = new EchoRequestHandler({
    frameworkName,
    ...options,
    handler: (event: H3Event) => ({
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
    }),
  });

  return handler.createHandler();
};
