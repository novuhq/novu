import { type APIGatewayEvent, type APIGatewayProxyEventV2, type APIGatewayProxyResult } from 'aws-lambda';
import { NovuRequestHandler, type ServeHandlerOptions } from '../handler';
import { type SupportedFrameworkName, type Either } from '../types';

/*
 * Re-export all top level exports from the main package.
 * This results in better DX reduces the chances of the dual package hazard for ESM + CJS packages.
 *
 * Example:
 *
 * import { serve, Client, type Workflow } from '@novu/framework/lambda';
 *
 * instead of
 *
 * import { serve } from '@novu/framework/lambda';
 * import { Client, type Workflow } from '@novu/framework';
 */
export * from '../index';
export const frameworkName: SupportedFrameworkName = 'lambda';

/**
 * With AWS Lambda, serve and register any declared workflows with Novu,
 * making them available to be triggered by events.
 *
 * @example
 *
 * ```ts
 * import { serve } from "@novu/framework/lambda";
 * import { myWorkflow } from "./src/novu/workflows";
 *
 * export const handler = serve({ workflows: [myWorkflow] });
 * ```
 */
export const serve = (options: ServeHandlerOptions) => {
  const handler = new NovuRequestHandler({
    frameworkName,
    ...options,
    handler: (event: Either<APIGatewayEvent, APIGatewayProxyEventV2>) => {
      const eventIsV2 = ((ev: APIGatewayEvent | APIGatewayProxyEventV2): ev is APIGatewayProxyEventV2 => {
        return (ev as APIGatewayProxyEventV2).version === '2.0';
      })(event);

      return {
        url: () => {
          const path = eventIsV2 ? event.requestContext.http.path : event.path;
          const proto = event.headers['x-forwarded-proto'] || 'https';

          const url = new URL(path, `${proto}://${event.headers.host || event.headers.Host || ''}`);

          for (const key in event.queryStringParameters) {
            if (key) {
              url.searchParams.set(key, event.queryStringParameters[key] as string);
            }
          }

          return url;
        },
        body: () => {
          let bodyContent = '{}';
          if (event.body) {
            bodyContent = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body;
          }

          return JSON.parse(bodyContent);
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
