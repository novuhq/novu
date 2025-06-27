import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ResourceOriginEnum, StepTypeEnum } from '@novu/shared';
import {
  InAppControlDto,
  EmailControlDto,
  SmsControlDto,
  PushControlDto,
  ChatControlDto,
  DelayControlDto,
  DigestControlDto,
  CustomControlDto,
} from '../dtos/controls';

const STEP_CONTROL_DTO_MAP = {
  [StepTypeEnum.IN_APP]: InAppControlDto,
  [StepTypeEnum.EMAIL]: EmailControlDto,
  [StepTypeEnum.SMS]: SmsControlDto,
  [StepTypeEnum.PUSH]: PushControlDto,
  [StepTypeEnum.CHAT]: ChatControlDto,
  [StepTypeEnum.DELAY]: DelayControlDto,
  [StepTypeEnum.DIGEST]: DigestControlDto,
  [StepTypeEnum.CUSTOM]: CustomControlDto,
};

export type ControlValuesValidationResult = {
  isValid: boolean;
  errors?: string[];
};

export async function validateControlValues(
  controlValues: Record<string, unknown> | null | undefined,
  stepType: StepTypeEnum,
  workflowOrigin: ResourceOriginEnum
): Promise<ControlValuesValidationResult> {
  // If controlValues is null or undefined, it's valid (optional field)
  if (controlValues == null) {
    return { isValid: true };
  }

  // If controlValues is not an object, it's invalid
  if (typeof controlValues !== 'object') {
    return {
      isValid: false,
      errors: ['Control values must be an object'],
    };
  }

  // For EXTERNAL workflows, allow any JSON object structure
  if (workflowOrigin === ResourceOriginEnum.EXTERNAL) {
    return { isValid: true };
  }

  // For NOVU_CLOUD workflows, validate against the specific control DTO
  if (workflowOrigin === ResourceOriginEnum.NOVU_CLOUD || workflowOrigin === ResourceOriginEnum.NOVU_CLOUD_V1) {
    const ControlDto = STEP_CONTROL_DTO_MAP[stepType];
    if (!ControlDto) {
      return {
        isValid: false,
        errors: [`No control DTO found for step type: ${stepType}`],
      };
    }

    try {
      const controlInstance = plainToInstance(ControlDto, controlValues as any);
      const validationErrors = await validate(controlInstance);

      if (validationErrors.length === 0) {
        return { isValid: true };
      }

      const errorMessages = validationErrors.map((error) => {
        const constraints = error.constraints || {};

        return Object.values(constraints).join(', ');
      });

      return {
        isValid: false,
        errors: errorMessages,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  // Default to allowing any object if origin is not specified or unknown
  return { isValid: true };
}

export function isExternalWorkflow(origin: ResourceOriginEnum): boolean {
  return origin === ResourceOriginEnum.EXTERNAL;
}

export function isNovuCloudWorkflow(origin: ResourceOriginEnum): boolean {
  return origin === ResourceOriginEnum.NOVU_CLOUD || origin === ResourceOriginEnum.NOVU_CLOUD_V1;
}
