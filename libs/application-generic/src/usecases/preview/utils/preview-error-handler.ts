import { HttpException, Injectable } from '@nestjs/common';
import { captureException } from '@sentry/node';
import { PinoLogger } from 'nestjs-pino';
import { GeneratePreviewResponseDto } from '../../../dtos/workflow/generate-preview-response.dto';
import { LOG_CONTEXT } from '../preview.constants';
import { FrameworkError, GeneratePreviewError } from '../preview.types';

type ErrorContent = {
  title: string;
  getMessage: (response: Record<string, unknown>, fallback: string) => string;
  hint: string;
};

const ERROR_CONTENT_MAPPINGS: Record<string, ErrorContent> = {
  STEP_RESOLVER_INVALID_CONTROLS: {
    title: 'Controls validation failed',
    getMessage: (response, fallback) => {
      const details = response.data;

      if (Array.isArray(details) && details.length > 0) {
        return details.map((d: Record<string, unknown>) => `• ${d.message ?? JSON.stringify(d)}`).join('\n');
      }

      return fallback;
    },
    hint: 'The control values sent to your step handler did not pass schema validation. Update the controls in the dashboard to match your controlSchema.',
  },
  STEP_HANDLER_ERROR: {
    title: 'Template error',
    getMessage: (_response, fallback) => fallback,
    hint: 'Fix the error in your template code and run "npx novu step publish" to redeploy.',
  },
  STEP_RESOLVER_UNAVAILABLE: {
    title: 'Preview unavailable',
    getMessage: () => 'Your step template code is unavailable. Try running "npx novu step publish" to redeploy.',
    hint: 'This is not a problem with your template code.',
  },
  STEP_RESOLVER_NOT_FOUND: {
    title: 'Preview unavailable',
    getMessage: () => 'No published step template code found. Run "npx novu step publish" to deploy your templates.',
    hint: 'This is not a problem with your template code.',
  },
  STEP_RESOLVER_AUTHENTICATION_FAILED: {
    title: 'Preview unavailable',
    getMessage: () => 'Preview failed due to an authentication error. Please contact support if this persists.',
    hint: 'This is not a problem with your template code.',
  },
  STEP_RESOLVER_PAYLOAD_TOO_LARGE: {
    title: 'Preview unavailable',
    getMessage: () => 'The preview payload is too large to process.',
    hint: 'This is not a problem with your template code.',
  },
  STEP_RESOLVER_TIMEOUT: {
    title: 'Preview unavailable',
    getMessage: () => 'Your step template took too long to render. Check for slow operations in your template code.',
    hint: 'This is not a problem with your template code.',
  },
  STEP_RESOLVER_ERROR: {
    title: 'Preview unavailable',
    getMessage: () => 'Failed to reach your step template code. Try running "npx novu step publish" to redeploy.',
    hint: 'This is not a problem with your template code.',
  },
  STEP_RESOLVER_HTTP_ERROR: {
    title: 'Preview unavailable',
    getMessage: () =>
      'An unexpected error occurred while rendering your step template. Please contact support if this persists.',
    hint: 'This is not a problem with your template code.',
  },
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
      const fallbackMessage = typeof response?.message === 'string' ? response.message : error.message;
      const mapping = ERROR_CONTENT_MAPPINGS[code];

      if (mapping) {
        return {
          title: mapping.title,
          message: mapping.getMessage(response, fallbackMessage),
          hint: mapping.hint,
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
