import { CredentialsFromConfig, httpRequestControlSchema } from '@novu/shared';
import type { FromSchema } from 'json-schema-to-ts';
import { HttpClientError, HttpClientErrorType, HttpClientService } from '../../../services/http-client';
import { IActionExecuteConfig, IActionExecuteResult, IActionHandler } from '../interfaces';

type HttpRequestCredentials = CredentialsFromConfig<[]>;
type HttpRequestControlType = FromSchema<typeof httpRequestControlSchema>;

export class HttpActionHandler implements IActionHandler {
  constructor(private readonly httpClient: HttpClientService) {}

  async execute({
    controlValues,
    signatureHeaders,
  }: IActionExecuteConfig<HttpRequestControlType, HttpRequestCredentials>): Promise<IActionExecuteResult> {
    const { url, method, headers = [], body = [] } = controlValues;

    if (!url) {
      throw new Error('HTTP action step is missing a URL. Please configure a URL in the step settings.');
    }

    const headersRecord = headers.reduce<Record<string, string>>((acc, { key, value }) => {
      acc[key] = value;

      return acc;
    }, {});

    const bodyObject =
      body.length > 0
        ? body.reduce<Record<string, unknown>>((acc, { key, value }) => {
            acc[key] = value;

            return acc;
          }, {})
        : undefined;

    const hasBody = !!bodyObject && method !== 'GET' && method !== 'DELETE';
    const mergedHeaders = { ...headersRecord, ...signatureHeaders };

    try {
      const response = await this.httpClient.request({
        url,
        method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        headers: mergedHeaders,
        ...(hasBody ? { body: bodyObject } : {}),
      });

      return {
        statusCode: response.statusCode,
        body: response.body,
        headers: response.headers,
      };
    } catch (error) {
      if (error instanceof HttpClientError && error.type === HttpClientErrorType.PARSE_ERROR) {
        return {
          statusCode: error.statusCode ?? 200,
          body: error.responseBody,
          headers: {},
        };
      }

      throw error;
    }
  }
}
