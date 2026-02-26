import type { RuntimeIssue, StepCreateDto, StepUpdateDto, UpdateWorkflowDto, WorkflowResponseDto } from '@novu/shared';
import { SeverityLevelEnum, StepTypeEnum } from '@novu/shared';
import { flatten } from 'flat';
import { ERROR_AVATAR, INFO_AVATAR, WARNING_AVATAR } from '@/utils/avatars';
import {
  DEFAULT_CONTROL_DELAY_AMOUNT,
  DEFAULT_CONTROL_DELAY_CRON,
  DEFAULT_CONTROL_DELAY_TYPE,
  DEFAULT_CONTROL_DELAY_UNIT,
  DEFAULT_CONTROL_DIGEST_AMOUNT,
  DEFAULT_CONTROL_DIGEST_CRON,
  DEFAULT_CONTROL_DIGEST_DIGEST_KEY,
  DEFAULT_CONTROL_DIGEST_TYPE,
  DEFAULT_CONTROL_DIGEST_UNIT,
  DEFAULT_CONTROL_THROTTLE_THRESHOLD,
  DEFAULT_CONTROL_THROTTLE_TYPE,
  DEFAULT_CONTROL_THROTTLE_UNIT,
  DEFAULT_CONTROL_THROTTLE_WINDOW,
  STEP_TYPE_LABELS,
} from '@/utils/constants';

export const getFirstErrorMessage = (
  issues?: {
    controls?: Record<string, RuntimeIssue[]>;
    integration?: Record<string, RuntimeIssue[]>;
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

export const countIssues = (issues?: {
  controls?: Record<string, RuntimeIssue[]>;
  integration?: Record<string, RuntimeIssue[]>;
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

export const getAllStepIssues = (issues?: {
  controls?: Record<string, RuntimeIssue[]>;
  integration?: Record<string, RuntimeIssue[]>;
}): RuntimeIssue[] => {
  if (!issues) return [];

  const allIssues: RuntimeIssue[] = [];

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

export const flattenIssues = (controlIssues?: Record<string, RuntimeIssue[]>): Record<string, string> => {
  const controlIssuesFlat: Record<string, RuntimeIssue[]> = flatten({ ...controlIssues }, { safe: true });

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
        const updatedControlValues =
          updateStep.controlValues !== undefined ? updateStep.controlValues : existingControlValues;

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

export const createStep = (
  type: StepTypeEnum,
  defaultLayoutId: string | undefined,
  severity?: SeverityLevelEnum
): StepCreateDto => {
  const controlValue: Record<string, unknown> = {};

  if (type === StepTypeEnum.DIGEST) {
    controlValue.type = DEFAULT_CONTROL_DIGEST_TYPE;
    controlValue.amount = DEFAULT_CONTROL_DIGEST_AMOUNT;
    controlValue.unit = DEFAULT_CONTROL_DIGEST_UNIT;
    controlValue.digestKey = DEFAULT_CONTROL_DIGEST_DIGEST_KEY;
    controlValue.cron = DEFAULT_CONTROL_DIGEST_CRON;
  }

  if (type === StepTypeEnum.DELAY) {
    controlValue.type = DEFAULT_CONTROL_DELAY_TYPE;
    controlValue.amount = DEFAULT_CONTROL_DELAY_AMOUNT;
    controlValue.unit = DEFAULT_CONTROL_DELAY_UNIT;
    controlValue.cron = DEFAULT_CONTROL_DELAY_CRON;
  }

  if (type === StepTypeEnum.THROTTLE) {
    controlValue.type = DEFAULT_CONTROL_THROTTLE_TYPE;
    controlValue.amount = DEFAULT_CONTROL_THROTTLE_WINDOW;
    controlValue.unit = DEFAULT_CONTROL_THROTTLE_UNIT;
    controlValue.threshold = DEFAULT_CONTROL_THROTTLE_THRESHOLD;
  }

  if (type === StepTypeEnum.EMAIL && defaultLayoutId) {
    controlValue.layoutId = defaultLayoutId;
  }

  if (type === StepTypeEnum.IN_APP) {
    let path = INFO_AVATAR;
    if (severity === SeverityLevelEnum.HIGH) {
      path = ERROR_AVATAR;
    } else if (severity === SeverityLevelEnum.MEDIUM) {
      path = WARNING_AVATAR;
    }
    controlValue.avatar = `${window.location.origin}${path}`;
  }

  return {
    name: STEP_TYPE_LABELS[type] + ' Step',
    type,
    controlValues: controlValue,
  };
};
