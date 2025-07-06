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
  StepUpdateDto,
  UpdateWorkflowDto,
  WorkflowResponseDto,
  Issue,
} from '@novu/shared';
import { StepTypeEnum } from '@novu/shared';
import { flatten } from 'flat';

export const getFirstErrorMessage = <T, D = T>(
  issues?: {
    controls?: Record<string, Issue<T>[]>;
    integration?: Record<string, Issue<D>[]>;
  },
  type: 'controls' | 'integration' = 'controls'
) => {
  const issuesArray = Object.entries({ ...issues?.[type] });

  if (issuesArray.length > 0) {
    const firstIssue = issuesArray[0];
    const contentIssues = firstIssue?.[1];
    return contentIssues?.[0];
  }
};

export const countIssues = <T, D = T>(issues?: {
  controls?: Record<string, Issue<T>[]>;
  integration?: Record<string, Issue<D>[]>;
}): number => {
  if (!issues) return 0;

  let count = 0;

  if (issues.controls) {
    const controlIssues = Object.values(issues.controls).reduce((acc, issueArray) => acc + issueArray.length, 0);

    count += controlIssues;
  }

  if (issues.integration) {
    const integrationIssues = Object.values(issues.integration).reduce((acc, issueArray) => acc + issueArray.length, 0);

    count += integrationIssues;
  }

  return count;
};

export const getAllStepIssues = <T, D = T>(issues?: {
  controls?: Record<string, Issue<T>[]>;
  integration?: Record<string, Issue<D>[]>;
}): Issue<T | D>[] => {
  if (!issues) return [];

  const allIssues: Issue<T | D>[] = [];

  if (issues.controls) {
    Object.values(issues.controls).forEach((issueArray) => {
      allIssues.push(...issueArray);
    });
  }

  if (issues.integration) {
    Object.values(issues.integration).forEach((issueArray) => {
      allIssues.push(...issueArray);
    });
  }

  return allIssues;
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
        const existingControlValues = step.controls?.values || {};
        const updatedControlValues = updateStep.controlValues || existingControlValues;

        return {
          ...step,
          ...updateStep,
          controlValues: updatedControlValues,
        };
      }

      return {
        ...step,
        controlValues: step.controls?.values || {},
      };
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
