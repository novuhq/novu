import { Injectable } from '@nestjs/common';
import {
  buildNovuSignatureHeader,
  CompileTemplate,
  GetDecryptedSecretKey,
  GetDecryptedSecretKeyCommand,
  HttpClientError,
  HttpClientService,
  HttpRequestOptions,
  InstrumentUsecase,
} from '@novu/application-generic';
import { TestHttpEndpointResponseDto } from '../../dtos/test-http-endpoint.dto';
import { TestHttpEndpointCommand } from './test-http-endpoint.command';

type KeyValuePair = { key: string; value: string };

@Injectable()
export class TestHttpEndpointUsecase {
  constructor(
    private readonly compileTemplate: CompileTemplate,
    private readonly httpClientService: HttpClientService,
    private readonly getDecryptedSecretKey: GetDecryptedSecretKey
  ) {}

  @InstrumentUsecase()
  async execute(command: TestHttpEndpointCommand): Promise<TestHttpEndpointResponseDto> {
    const { controlValues = {}, previewPayload } = command;

    const compileContext = this.buildCompileContext(previewPayload);

    const rawUrl = (controlValues.url as string) ?? '';
    const method = (controlValues.method as string) ?? 'GET';
    const rawHeaders = (controlValues.headers as KeyValuePair[]) ?? [];
    const rawBody = (controlValues.body as KeyValuePair[]) ?? [];

    const resolvedUrl = await this.compileString(rawUrl, compileContext);

    const resolvedHeaders: Record<string, string> = {};
    for (const { key, value } of rawHeaders) {
      if (key) {
        resolvedHeaders[key] = await this.compileString(value, compileContext);
      }
    }

    const resolvedBodyPairs: Record<string, unknown> = {};
    for (const { key, value } of rawBody) {
      if (key) {
        resolvedBodyPairs[key] = await this.compileString(value, compileContext);
      }
    }

    const hasBody = Object.keys(resolvedBodyPairs).length > 0 && method !== 'GET' && method !== 'DELETE';

    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({ environmentId: command.user.environmentId })
    );
    resolvedHeaders['novu-signature'] = buildNovuSignatureHeader(secretKey, hasBody ? resolvedBodyPairs : {});

    const startTime = performance.now();

    try {
      const response = await this.httpClientService.request({
        url: resolvedUrl,
        method: method as HttpRequestOptions['method'],
        headers: resolvedHeaders,
        ...(hasBody ? { body: resolvedBodyPairs } : {}),
        timeout: 30_000,
      });
      const durationMs = Math.round(performance.now() - startTime);

      return {
        statusCode: response.statusCode,
        body: response.body,
        headers: response.headers,
        durationMs,
        resolvedRequest: {
          url: resolvedUrl,
          method,
          headers: resolvedHeaders,
          ...(hasBody ? { body: resolvedBodyPairs } : {}),
        },
      };
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime);

      if (error instanceof HttpClientError && error.statusCode) {
        return {
          statusCode: error.statusCode,
          body: error.responseBody ?? null,
          headers: {},
          durationMs,
          resolvedRequest: {
            url: resolvedUrl,
            method,
            headers: resolvedHeaders,
            ...(hasBody ? { body: resolvedBodyPairs } : {}),
          },
        };
      }

      throw error;
    }
  }

  private buildCompileContext(previewPayload?: TestHttpEndpointCommand['previewPayload']): Record<string, unknown> {
    if (!previewPayload) {
      return {};
    }

    return {
      subscriber: previewPayload.subscriber ?? {},
      payload: previewPayload.payload ?? {},
      steps: previewPayload.steps ?? {},
      ...(previewPayload.context ? { context: previewPayload.context } : {}),
    };
  }

  private async compileString(template: string, data: Record<string, unknown>): Promise<string> {
    if (!template || !template.includes('{{')) {
      return template;
    }

    return this.compileTemplate.execute({ template, data });
  }
}
