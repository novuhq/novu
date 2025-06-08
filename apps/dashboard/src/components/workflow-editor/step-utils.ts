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
import type {
  StepContentIssue,
  StepCreateDto,
  StepIssuesDto,
  StepUpdateDto,
  UpdateWorkflowDto,
  WorkflowResponseDto,
} from '@novu/shared';
import { StepTypeEnum } from '@novu/shared';
import { flatten } from 'flat';

export const getFirstErrorMessage = (issues: StepIssuesDto, type: 'controls' | 'integration') => {
  const issuesArray = Object.entries({ ...issues?.[type] });

  if (issuesArray.length > 0) {
    const firstIssue = issuesArray[0];
    const contentIssues = firstIssue?.[1];
    return contentIssues?.[0];
  }
};

export const flattenIssues = (controlIssues?: Record<string, StepContentIssue[]>): Record<string, string> => {
  const controlIssuesFlat: Record<string, StepContentIssue[]> = flatten({ ...controlIssues }, { safe: true });

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
