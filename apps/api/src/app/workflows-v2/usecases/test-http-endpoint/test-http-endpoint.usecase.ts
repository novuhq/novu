import { BadRequestException, Injectable } from '@nestjs/common';
import {
  buildNovuSignatureHeader,
  GetDecryptedSecretKey,
  GetDecryptedSecretKeyCommand,
  HttpClientError,
  HttpClientErrorType,
  HttpClientService,
  HttpRequestOptions,
  InstrumentUsecase,
  KeyValuePair,
  resolveHttpRequestBody,
  shouldIncludeBody,
} from '@novu/application-generic';
import { createLiquidEngine } from '@novu/framework/internal';
import { Liquid } from 'liquidjs';
import { TestHttpEndpointResponseDto } from '../../dtos/test-http-endpoint.dto';
import { TestHttpEndpointCommand } from './test-http-endpoint.command';

const HTTP_CLIENT_ERROR_STATUS_MAP: Record<HttpClientErrorType, number> = {
  [HttpClientErrorType.TIMEOUT]: 408,
  [HttpClientErrorType.NETWORK_ERROR]: 502,
  [HttpClientErrorType.CERTIFICATE_ERROR]: 502,
  [HttpClientErrorType.UNSUPPORTED_PROTOCOL]: 400,
  [HttpClientErrorType.MAX_REDIRECTS]: 502,
  [HttpClientErrorType.READ_ERROR]: 502,
  [HttpClientErrorType.UPLOAD_ERROR]: 502,
  [HttpClientErrorType.CACHE_ERROR]: 502,
  [HttpClientErrorType.PARSE_ERROR]: 502,
  [HttpClientErrorType.HTTP_ERROR]: 500,
  [HttpClientErrorType.UNKNOWN]: 500,
};

@Injectable()
export class TestHttpEndpointUsecase {
  private readonly liquidEngine: Liquid;

  constructor(
    private readonly httpClientService: HttpClientService,
    private readonly getDecryptedSecretKey: GetDecryptedSecretKey
  ) {
    this.liquidEngine = createLiquidEngine();
  }

  @InstrumentUsecase()
  async execute(command: TestHttpEndpointCommand): Promise<TestHttpEndpointResponseDto> {
    const { controlValues = {}, previewPayload } = command;

    const compileContext = this.buildCompileContext(previewPayload);

    let compiled: typeof controlValues;
    try {
      compiled = (await this.compileControlValues(controlValues, compileContext)) as typeof controlValues;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unknown error';

      throw new BadRequestException(`HTTP request step template compilation failed: ${message}`);
    }

    const resolvedUrl = (compiled.url as string) ?? '';
    const method = (compiled.method as string) ?? 'GET';
    const compiledHeaders = (compiled.headers as KeyValuePair[]) ?? [];
    const compiledBody = compiled.body as string | KeyValuePair[] | undefined;

    const resolvedHeaders: Record<string, string> = Object.fromEntries(
      compiledHeaders.filter(({ key }) => key).map(({ key, value }) => [key, value])
    );

    const startTime = performance.now();

    let resolvedBody: Record<string, unknown> | unknown[] | undefined;
    try {
      resolvedBody = resolveHttpRequestBody(compiledBody);
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : 'Failed to parse raw JSON body';

      return {
        statusCode: 400,
        body: { error: `Invalid raw JSON body: ${errorMessage}` },
        headers: {},
        durationMs: Math.round(performance.now() - startTime),
        resolvedRequest: {
          url: resolvedUrl,
          method,
          headers: resolvedHeaders,
        },
      };
    }

    const hasBody = shouldIncludeBody(resolvedBody, method);

    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({ environmentId: command.user.environmentId })
    );
    resolvedHeaders['novu-signature'] = buildNovuSignatureHeader(secretKey, hasBody ? resolvedBody : {});

    try {
      const response = await this.httpClientService.request<string>({
        url: resolvedUrl,
        method: method as HttpRequestOptions['method'],
        headers: resolvedHeaders,
        ...(hasBody ? { body: resolvedBody } : {}),
        timeout: 30_000,
        responseType: 'text',
      });
      const durationMs = Math.round(performance.now() - startTime);

      return {
        statusCode: response.statusCode,
        body: tryParseJson(response.body),
        headers: response.headers,
        durationMs,
        resolvedRequest: {
          url: resolvedUrl,
          method,
          headers: resolvedHeaders,
          ...(hasBody ? { body: resolvedBody } : {}),
        },
      };
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime);

      if (error instanceof HttpClientError) {
        const statusCode = error.statusCode ?? HTTP_CLIENT_ERROR_STATUS_MAP[error.type] ?? 500;

        return {
          statusCode,
          body: error.responseBody ?? {
            error: error.message,
            type: error.type,
            ...(error.networkCode ? { networkCode: error.networkCode } : {}),
          },
          headers: {},
          durationMs,
          resolvedRequest: {
            url: resolvedUrl,
            method,
            headers: resolvedHeaders,
            ...(hasBody ? { body: resolvedBody } : {}),
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
      env: previewPayload.env ?? {},
      ...(previewPayload.context ? { context: previewPayload.context } : {}),
    };
  }

  private async compileControlValues(
    values: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<unknown> {
    const compiled = await this.liquidEngine.parseAndRender(JSON.stringify(values), context);

    try {
      return JSON.parse(compiled);
    } catch {
      throw new Error('Rendered template output is not valid JSON');
    }
  }
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
