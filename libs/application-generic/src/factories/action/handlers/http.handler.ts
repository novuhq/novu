import { CredentialsFromConfig, httpRequestControlSchema } from '@novu/shared';
import type { FromSchema } from 'json-schema-to-ts';
import { IActionExecuteConfig, IActionExecuteResult, IActionHandler } from '../interfaces';

type HttpRequestCredentials = CredentialsFromConfig<[]>;
type HttpRequestControlType = FromSchema<typeof httpRequestControlSchema>;

export class HttpActionHandler implements IActionHandler {
  async execute({
    controlValues,
  }: IActionExecuteConfig<HttpRequestControlType, HttpRequestCredentials>): Promise<IActionExecuteResult> {
    const { url, method, headers = [], body = [] } = controlValues;

    if (!url) {
      throw new Error('HTTP action step is missing a URL. Please configure a URL in the step settings.');
    }

    const headersRecord = headers.reduce<Record<string, string>>((acc, { key, value }) => {
      acc[key] = value;

      return acc;
    }, {});

    const bodyString =
      body.length > 0
        ? JSON.stringify(
            body.reduce<Record<string, unknown>>((acc, { key, value }) => {
              acc[key] = value;

              return acc;
            }, {})
          )
        : undefined;

    const hasBody = !!bodyString && method !== 'GET' && method !== 'DELETE';
    const resolvedHeaders = this.buildHeaders(headersRecord);

    const requestInit = {
      method,
      headers: resolvedHeaders,
    } as RequestInit;

    if (hasBody) {
      requestInit.body = bodyString;

      if (!resolvedHeaders['content-type'] && !resolvedHeaders['Content-Type']) {
        (resolvedHeaders as Record<string, string>)['Content-Type'] = 'application/json';
      }
    }

    const response = await fetch(url, requestInit);
    const responseText = await response.text();

    let parsedBody: unknown;

    try {
      parsedBody = JSON.parse(responseText);
    } catch {
      parsedBody = responseText;
    }

    return {
      statusCode: response.status,
      body: parsedBody,
      headers: Object.fromEntries(response.headers as unknown as Iterable<[string, string]>),
    };
  }

  private buildHeaders(stepHeaders: Record<string, string>): Record<string, string> {
    return { ...stepHeaders };
  }
}
