import {
  type APIGatewayEvent,
  type APIGatewayProxyEventV2,
  type APIGatewayProxyResult,
  type Context,
} from 'aws-lambda';
import { NovuRequestHandler, type ServeHandlerOptions } from '../handler';
import { type SupportedFrameworkName, type Either } from '../types';

export const frameworkName: SupportedFrameworkName = 'aws-lambda';

export const serve = (options: ServeHandlerOptions) => {
  const handler = new NovuRequestHandler({
    frameworkName,
    ...options,
    handler: (event: Either<APIGatewayEvent, APIGatewayProxyEventV2>, _context: Context) => {
      const eventIsV2 = ((ev: APIGatewayEvent | APIGatewayProxyEventV2): ev is APIGatewayProxyEventV2 => {
        return (ev as APIGatewayProxyEventV2).version === '2.0';
      })(event);

      return {
        url: () => {
          const path = eventIsV2 ? event.requestContext.http.path : event.path;
          const proto = event.headers['x-forwarded-proto'] || 'https';

          const url = new URL(path, `${proto}://${event.headers.host || ''}`);

          return url;
        },
        body: () => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return JSON.parse(
            event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body) : '{}'
          );
        },
        headers: (key) => event.headers[key],
        queryString: (key) => {
          return event.queryStringParameters?.[key];
        },
        transformResponse: ({ body, status: statusCode, headers }): Promise<APIGatewayProxyResult> => {
          return Promise.resolve({ body, statusCode, headers });
        },
        method: () => {
          return eventIsV2 ? event.requestContext.http.method : event.httpMethod;
        },
      };
    },
  });

  return handler.createHandler();
};
