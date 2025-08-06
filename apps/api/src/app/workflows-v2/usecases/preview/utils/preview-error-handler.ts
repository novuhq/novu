import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { captureException } from '@sentry/node';
import { GeneratePreviewResponseDto } from '../../../dtos';
import { LOG_CONTEXT } from '../preview.constants';
import { FrameworkError, GeneratePreviewError } from '../preview.types';

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
}
