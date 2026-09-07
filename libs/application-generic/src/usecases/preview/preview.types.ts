import { InternalServerErrorException } from '@nestjs/common';
import { JobStatusEnum, NotificationTemplateEntity } from '@novu/dal';
import { JSONSchemaDto } from '../../dtos/json-schema.dto';
import { StepResponseDto } from '../../dtos/workflow/step.response.dto';
import { StepType } from '../../services';

export type PreviewContext = {
  stepData: StepResponseDto;
  controlValues: Record<string, unknown>;
  variableSchema: JSONSchemaDto;
  variablesObject: Record<string, unknown>;
  workflow: NotificationTemplateEntity;
};

export type PreviewTemplateData = {
  payloadExample: Record<string, unknown>;
  controlValues: Record<string, unknown>;
};

export type FrameworkError = {
  response: {
    message: string;
    code: string;
    data: unknown;
  };
  status: number;
  options: Record<string, unknown>;
  message: string;
  name: string;
};

export class GeneratePreviewError extends InternalServerErrorException {
  constructor(error: FrameworkError) {
    super({
      message: `GeneratePreviewError: Original Message:`,
      frameworkMessage: error.response.message,
      code: error.response.code,
      data: error.response.data,
    });
  }
}

export type ControlValueProcessingResult = {
  sanitizedControls: Record<string, unknown>;
  previewTemplateData: PreviewTemplateData;
};

export type MockStepResultOptions = {
  stepType: StepType;
  workflow?: NotificationTemplateEntity;
  responseBodySchema?: Record<string, unknown>;
};

export type FrameworkPreviousStepsOutputState = {
  stepId: string;
  outputs: Record<string, unknown>;
  state: {
    status: JobStatusEnum;
    error?: string;
  };
};
