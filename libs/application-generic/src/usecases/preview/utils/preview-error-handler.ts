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

  extractErrorContent(error: unknown): { title: string; message: string; hint: string } {
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
}
