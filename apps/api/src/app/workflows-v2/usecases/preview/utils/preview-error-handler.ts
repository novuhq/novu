import { HttpException, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { captureException } from '@sentry/node';
import { GeneratePreviewResponseDto } from '../../../dtos';
import { LOG_CONTEXT } from '../preview.constants';
import { FrameworkError, GeneratePreviewError } from '../preview.types';

const PLATFORM_ERROR_MESSAGES: Record<string, string> = {
  STEP_RESOLVER_UNAVAILABLE:
    'Your email template code is unavailable. Try running "npx novu email publish" to redeploy.',
  STEP_RESOLVER_NOT_FOUND:
    'No published email template code found. Run "npx novu email publish" to deploy your templates.',
  STEP_RESOLVER_AUTHENTICATION_FAILED:
    'Preview failed due to an authentication error. Please contact support if this persists.',
  STEP_RESOLVER_PAYLOAD_TOO_LARGE: 'The preview payload is too large to process.',
  STEP_RESOLVER_TIMEOUT:
    'Your email template took too long to render. Check for slow operations in your template code.',
  STEP_RESOLVER_ERROR: 'Failed to reach your email template code. Try running "npx novu email publish" to redeploy.',
  STEP_RESOLVER_HTTP_ERROR:
    'An unexpected error occurred while rendering your email template. Please contact support if this persists.',
};

@Injectable()
export class PreviewErrorHandler {
  constructor(private readonly logger: PinoLogger) {}

  async handleErrors<T>(
    operation: () => Promise<T>,
    workflowIdOrInternalId?: string,
    stepIdOrInternalId?: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logger.error(
        {
          err: error,
          workflowIdOrInternalId,
          stepIdOrInternalId,
        },
        `Unexpected error while generating preview`,
        LOG_CONTEXT
      );

      if (process.env.SENTRY_DSN) {
        captureException(error);
      }

      throw error;
    }
  }

  createErrorResponse(): GeneratePreviewResponseDto {
    return {
      result: {
        preview: {},
        type: undefined,
      },
      previewPayloadExample: {},
      schema: null,
    } as any;
  }

  isFrameworkError(obj: any): obj is FrameworkError {
    return typeof obj === 'object' && obj.status === '400' && obj.name === 'BridgeRequestError';
  }

  handleFrameworkError(error: unknown): never {
    if (this.isFrameworkError(error)) {
      throw new GeneratePreviewError(error);
    } else {
      throw error;
    }
  }

  buildPreviewErrorHtml(error: unknown): string {
    const { title, message, hint } = this.extractErrorContent(error);

    return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fc; padding: 40px 24px; min-height: 320px; display: flex; align-items: flex-start; justify-content: center;">
  <div style="max-width: 480px; width: 100%; background: #ffffff; border: 1px solid #e3e7ee; border-radius: 8px; box-shadow: 0px 1px 2px 0px rgba(10, 13, 20, 0.03); overflow: hidden;">
    <div style="padding: 16px; border-bottom: 1px solid #e3e7ee; display: flex; align-items: center; gap: 8px;">
      <div style="width: 20px; height: 20px; border-radius: 50%; background: hsl(355 96% 60% / 10%); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Z" fill="hsl(355, 70%, 48%)"/>
          <path d="M8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" fill="hsl(355, 70%, 48%)"/>
        </svg>
      </div>
      <span style="color: #0f1117; font-weight: 500; font-size: 13px; letter-spacing: -0.005em;">${title}</span>
    </div>
    <div style="padding: 16px;">
      <pre style="margin: 0 0 12px; background: #f8f9fc; border: 1px solid #e3e7ee; border-radius: 6px; padding: 12px; font-size: 12px; color: #525866; white-space: pre-wrap; word-break: break-word; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; line-height: 1.6;">${this.escapeHtml(message)}</pre>
      <p style="margin: 0; font-size: 12px; color: #717784; line-height: 1.5;">${hint}</p>
    </div>
  </div>
</div>`;
  }

  private extractErrorContent(error: unknown): { title: string; message: string; hint: string } {
    if (error instanceof HttpException) {
      const response = error.getResponse() as Record<string, unknown>;
      const code = typeof response?.code === 'string' ? response.code : '';
      const message = typeof response?.message === 'string' ? response.message : error.message;

      if (code === 'STEP_HANDLER_ERROR') {
        return {
          title: 'Template error',
          message,
          hint: 'Fix the error in your template code and run "npx novu email publish" to redeploy.',
        };
      }

      const platformMessage = PLATFORM_ERROR_MESSAGES[code];

      if (platformMessage) {
        return {
          title: 'Preview unavailable',
          message: platformMessage,
          hint: 'This is not a problem with your template code.',
        };
      }
    }

    return {
      title: 'Preview failed',
      message: 'An unexpected error occurred while rendering the preview.',
      hint: 'Please try again. If the issue persists, contact support.',
    };
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}
