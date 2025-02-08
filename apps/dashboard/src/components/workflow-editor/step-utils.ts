import { flatten } from 'flat';
import type {
  ContentIssue,
  StepCreateDto,
  StepIssuesDto,
  StepUpdateDto,
  UpdateWorkflowDto,
  WorkflowResponseDto,
} from '@novu/shared';
import { StepTypeEnum } from '@novu/shared';
import {
  DEFAULT_CONTROL_DELAY_AMOUNT,
  DEFAULT_CONTROL_DELAY_TYPE,
  DEFAULT_CONTROL_DELAY_UNIT,
  DEFAULT_CONTROL_DIGEST_AMOUNT,
  DEFAULT_CONTROL_DIGEST_CRON,
  DEFAULT_CONTROL_DIGEST_DIGEST_KEY,
  DEFAULT_CONTROL_DIGEST_UNIT,
  STEP_TYPE_LABELS,
} from '@/utils/constants';

export const getFirstBodyErrorMessage = (issues?: StepIssuesDto) => {
  const stepIssuesArray = Object.entries({ ...issues?.body });
  if (stepIssuesArray.length > 0) {
    const firstIssue = stepIssuesArray[0];
    const errorMessage = firstIssue[1]?.message;
    return errorMessage;
  }
};

export const getFirstControlsErrorMessage = (issues?: StepIssuesDto) => {
  const controlsIssuesArray = Object.entries({ ...issues?.controls });
  if (controlsIssuesArray.length > 0) {
    const firstIssue = controlsIssuesArray[0];
    const contentIssues = firstIssue?.[1];
    const errorMessage = contentIssues?.[0]?.message;
    return errorMessage;
  }
};

export const flattenIssues = (controlIssues?: Record<string, ContentIssue[]>): Record<string, string> => {
  const controlIssuesFlat: Record<string, ContentIssue[]> = flatten({ ...controlIssues }, { safe: true });

  return Object.entries(controlIssuesFlat).reduce((acc, [key, value]) => {
    const errorMessage = value.length > 0 ? value[0].message : undefined;
    if (!errorMessage) {
      return acc;
    }

    return { ...acc, [key]: errorMessage };
  }, {});
};

export const updateStepInWorkflow = (
  workflow: WorkflowResponseDto,
  stepId: string,
  updateStep: Partial<StepUpdateDto>
): UpdateWorkflowDto => {
  return {
    ...workflow,
    steps: workflow.steps.map((step) => {
      if (step.stepId === stepId) {
        return { ...step, ...updateStep };
      }
      return step;
    }),
  };
};

export const createStep = (type: StepTypeEnum): StepCreateDto => {
  const controlValue: Record<string, unknown> = {};

  if (type === StepTypeEnum.DIGEST) {
    controlValue.amount = DEFAULT_CONTROL_DIGEST_AMOUNT;
    controlValue.unit = DEFAULT_CONTROL_DIGEST_UNIT;
    controlValue.digestKey = DEFAULT_CONTROL_DIGEST_DIGEST_KEY;
    controlValue.cron = DEFAULT_CONTROL_DIGEST_CRON;
  }

  if (type === StepTypeEnum.DELAY) {
    controlValue.amount = DEFAULT_CONTROL_DELAY_AMOUNT;
    controlValue.unit = DEFAULT_CONTROL_DELAY_UNIT;
    controlValue.type = DEFAULT_CONTROL_DELAY_TYPE;
  }

  return {
    name: STEP_TYPE_LABELS[type] + ' Step',
    type,
    controlValues: controlValue,
  };
};
