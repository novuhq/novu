import { Injectable } from '@nestjs/common';
import { CompileTemplate, InstrumentUsecase } from '@novu/application-generic';
import { TestHttpEndpointResponseDto } from '../../dtos/test-http-endpoint.dto';
import { TestHttpEndpointCommand } from './test-http-endpoint.command';

type KeyValuePair = { key: string; value: string };

@Injectable()
export class TestHttpEndpointUsecase {
  constructor(private readonly compileTemplate: CompileTemplate) {}

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
    const bodyString = hasBody ? JSON.stringify(resolvedBodyPairs) : undefined;

    const requestHeaders = { ...resolvedHeaders };
    if (hasBody && !requestHeaders['content-type'] && !requestHeaders['Content-Type']) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    const requestInit: RequestInit = { method, headers: requestHeaders };
    if (bodyString) {
      requestInit.body = bodyString;
    }

    const startTime = performance.now();
    const response = await fetch(resolvedUrl, requestInit);
    const durationMs = Math.round(performance.now() - startTime);

    const responseText = await response.text();
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(responseText);
    } catch {
      parsedBody = responseText || null;
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      statusCode: response.status,
      body: parsedBody,
      headers: responseHeaders,
      durationMs,
      resolvedRequest: {
        url: resolvedUrl,
        method,
        headers: resolvedHeaders,
        ...(hasBody ? { body: resolvedBodyPairs } : {}),
      },
    };
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
