import { BadRequestException, Injectable } from '@nestjs/common';
import {
  buildInvalidJsonBodyDetail,
  buildNovuSignatureHeader,
  enhanceStepsMap,
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
import { compileJsonControlValues, createLiquidEngine, repairJsonString } from '@novu/framework/internal';
import { isOutboundSsrfProtectionEnabled } from '@novu/shared';
import { assertSafeOutboundUrl, SsrfBlockedError } from '@novu/shared/utils/ssrf-url-validation';
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
  [HttpClientErrorType.SSRF_BLOCKED]: 400,
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
    const compiled = await this.compileControls(controlValues, compileContext);
    const resolvedUrl = (compiled.url as string) ?? '';
    const method = (compiled.method as string) ?? 'GET';
    const compiledHeaders = (compiled.headers as KeyValuePair[]) ?? [];
    const compiledBody = compiled.body as string | KeyValuePair[] | undefined;
    const resolvedHeaders: Record<string, string> = Object.fromEntries(
      compiledHeaders.filter(({ key }) => key).map(({ key, value }) => [key, value])
    );
    const startTime = performance.now();
    const resolvedBody = this.resolveBody(compiledBody, startTime, resolvedUrl, method, resolvedHeaders);
    if ('statusCode' in resolvedBody) {
      return resolvedBody;
    }

    const hasBody = shouldIncludeBody(resolvedBody.body, method);
    const blocked = this.blockedUrlResponse(
      resolvedUrl,
      startTime,
      method,
      resolvedHeaders,
      resolvedBody.body,
      hasBody
    );
    if (blocked) {
      return blocked;
    }

    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({ environmentId: command.user.environmentId })
    );
    resolvedHeaders['novu-signature'] = buildNovuSignatureHeader(secretKey, hasBody ? resolvedBody.body : {});

    return this.sendTestRequest(resolvedUrl, method, resolvedHeaders, resolvedBody.body, hasBody, startTime);
  }

  private async compileControls(
    controlValues: Record<string, unknown>,
    compileContext: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      return (await this.compileControlValues(controlValues, compileContext)) as Record<string, unknown>;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unknown error';

      throw new BadRequestException(`HTTP request step template compilation failed: ${message}`);
    }
  }

  private resolveBody(
    compiledBody: string | KeyValuePair[] | undefined,
    startTime: number,
    resolvedUrl: string,
    method: string,
    resolvedHeaders: Record<string, string>
  ): TestHttpEndpointResponseDto | { body: Record<string, unknown> | unknown[] | undefined } {
    try {
      const resolvedBodyInput =
        typeof compiledBody === 'string' && compiledBody.trim() ? repairJsonString(compiledBody) : compiledBody;

      return { body: resolveHttpRequestBody(resolvedBodyInput) };
    } catch (parseError) {
      return {
        statusCode: 400,
        body: buildInvalidJsonBodyDetail(parseError, compiledBody),
        headers: {},
        durationMs: Math.round(performance.now() - startTime),
        resolvedRequest: { url: resolvedUrl, method, headers: resolvedHeaders },
      };
    }
  }

  private blockedUrlResponse(
    resolvedUrl: string,
    startTime: number,
    method: string,
    resolvedHeaders: Record<string, string>,
    resolvedBody: Record<string, unknown> | unknown[] | undefined,
    hasBody: boolean
  ): TestHttpEndpointResponseDto | undefined {
    try {
      assertSafeOutboundUrl(resolvedUrl);

      return undefined;
    } catch (err) {
      const message = err instanceof SsrfBlockedError ? err.message : String(err);

      return {
        statusCode: 400,
        body: { error: message },
        headers: {},
        durationMs: Math.round(performance.now() - startTime),
        resolvedRequest: {
          url: resolvedUrl,
          method,
          headers: resolvedHeaders,
          ...(hasBody ? { body: resolvedBody } : {}),
        },
      };
    }
  }

  private async sendTestRequest(
    resolvedUrl: string,
    method: string,
    resolvedHeaders: Record<string, string>,
    resolvedBody: Record<string, unknown> | unknown[] | undefined,
    hasBody: boolean,
    startTime: number
  ): Promise<TestHttpEndpointResponseDto> {
    const resolvedRequest = {
      url: resolvedUrl,
      method,
      headers: resolvedHeaders,
      ...(hasBody ? { body: resolvedBody } : {}),
    };

    try {
      const response = await this.httpClientService.request<string>({
        url: resolvedUrl,
        method: method as HttpRequestOptions['method'],
        headers: resolvedHeaders,
        ...(hasBody ? { body: resolvedBody } : {}),
        timeout: 30_000,
        responseType: 'text',
        enforceSsrfProtection: isOutboundSsrfProtectionEnabled(),
      });

      return {
        statusCode: response.statusCode,
        body: tryParseJson(response.body),
        headers: response.headers,
        durationMs: Math.round(performance.now() - startTime),
        resolvedRequest,
      };
    } catch (error) {
      if (!(error instanceof HttpClientError)) {
        throw error;
      }

      const statusCode = error.statusCode ?? HTTP_CLIENT_ERROR_STATUS_MAP[error.type] ?? 500;

      return {
        statusCode,
        body: error.responseBody ?? {
          error: error.message,
          type: error.type,
          ...(error.networkCode ? { networkCode: error.networkCode } : {}),
        },
        headers: {},
        durationMs: Math.round(performance.now() - startTime),
        resolvedRequest,
      };
    }
  }

  private buildCompileContext(previewPayload?: TestHttpEndpointCommand['previewPayload']): Record<string, unknown> {
    if (!previewPayload) {
      return {};
    }

    return {
      subscriber: previewPayload.subscriber ?? {},
      payload: previewPayload.payload ?? {},
      steps: enhanceStepsMap((previewPayload.steps ?? {}) as Record<string, Record<string, unknown>>),
      env: previewPayload.env ?? {},
      ...(previewPayload.context ? { context: previewPayload.context } : {}),
    };
  }

  private async compileControlValues(
    values: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<unknown> {
    return compileJsonControlValues(values, context, this.liquidEngine);
  }
}

function tryParseJson(text: string): JsonValue {
  try {
    const parsed = JSON.parse(text);
    if (isJsonValue(parsed)) {
      return parsed;
    }

    return text;
  } catch {
    return text;
  }
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (typeof value === 'object') {
    return Object.values(value).every(isJsonValue);
  }

  return false;
}
