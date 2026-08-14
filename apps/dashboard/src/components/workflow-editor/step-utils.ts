import type {
  RuntimeIssue,
  StepCreateDto,
  StepResponseDto,
  StepUpdateDto,
  UpdateWorkflowDto,
  WorkflowResponseDto,
} from '@novu/shared';
import { SeverityLevelEnum, StepIssueSeverityEnum, StepTypeEnum } from '@novu/shared';
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
  DEFAULT_CONTROL_HTTP_REQUEST_BODY,
  DEFAULT_CONTROL_HTTP_REQUEST_CONTINUE_ON_FAILURE,
  DEFAULT_CONTROL_HTTP_REQUEST_ENFORCE_SCHEMA_VALIDATION,
  DEFAULT_CONTROL_HTTP_REQUEST_HEADERS,
  DEFAULT_CONTROL_HTTP_REQUEST_METHOD,
  DEFAULT_CONTROL_HTTP_REQUEST_RESPONSE_BODY_SCHEMA,
  DEFAULT_CONTROL_HTTP_REQUEST_TIMEOUT,
  DEFAULT_CONTROL_THROTTLE_THRESHOLD,
  DEFAULT_CONTROL_THROTTLE_TYPE,
  DEFAULT_CONTROL_THROTTLE_UNIT,
  DEFAULT_CONTROL_THROTTLE_WINDOW,
  DEFAULT_CONTROL_WAIT_AMOUNT,
  DEFAULT_CONTROL_WAIT_UNIT,
  STEP_TYPE_LABELS,
} from '@/utils/constants';
import { getIdFromSlug, STEP_DIVIDER } from '@/utils/id-utils';

export function findDigestStepBeforeCurrent(
  steps: StepResponseDto[] | undefined,
  currentStep: StepResponseDto | undefined
): StepResponseDto | undefined {
  if (!steps || !currentStep) return undefined;

  const index = steps.findIndex(
    (candidate) =>
      getIdFromSlug({ slug: candidate.slug, divider: STEP_DIVIDER }) ===
      getIdFromSlug({ slug: currentStep.slug, divider: STEP_DIVIDER })
  );

  if (index < 1) return undefined;

  return steps
    .slice(0, index)
    .reverse()
    .find((candidate) => candidate.type === 'digest');
}

/**
 * A step issue blocks save unless it is explicitly a `warning`. Legacy issues without a `severity`
 * are treated as blocking errors for backwards compatibility.
 */
export const isBlockingIssue = (issue: Pick<RuntimeIssue, 'severity'>): boolean =>
  issue.severity !== StepIssueSeverityEnum.WARNING;

export const getFirstErrorMessage = (
  issues?: {
    controls?: Record<string, RuntimeIssue[]>;
    integration?: Record<string, RuntimeIssue[]>;
  },
  type: 'controls' | 'integration' = 'controls'
) => {
  const issuesArrays = Object.values({ ...issues?.[type] });

  for (const contentIssues of issuesArrays) {
    const blockingIssue = contentIssues?.find(isBlockingIssue);

    if (blockingIssue) {
      return blockingIssue;
    }
  }

  return undefined;
};

/** Counts only blocking (non-warning) issues — the ones that gate the workflow / turn a step red. */
export const countIssues = (issues?: {
  controls?: Record<string, RuntimeIssue[]>;
  integration?: Record<string, RuntimeIssue[]>;
}): number => {
  if (!issues) return 0;

  const countBlocking = (issueMap: Record<string, RuntimeIssue[]>) =>
    Object.values(issueMap).reduce((acc, issueArray) => acc + issueArray.filter(isBlockingIssue).length, 0);

  let count = 0;

  if (issues.controls) {
    count += countBlocking(issues.controls);
  }

  if (issues.integration) {
    count += countBlocking(issues.integration);
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
    // Only blocking issues become form-field errors; warnings are surfaced separately and must not
    // mark the control invalid.
    const errorMessage = value.find(isBlockingIssue)?.message;

    if (!errorMessage) {
      return acc;
    }

    return { ...acc, [key]: errorMessage };
  }, {});
};

function splitProviderOverridesFromControlValues(controlValues: Record<string, unknown> | null | undefined): {
  controlValues: Record<string, unknown> | null | undefined;
  providerOverrides: StepUpdateDto['providerOverrides'] | undefined;
} {
  if (!controlValues || typeof controlValues !== 'object') {
    return { controlValues, providerOverrides: undefined };
  }

  const { providerOverrides, ...rest } = controlValues as Record<string, unknown> & {
    providerOverrides?: StepUpdateDto['providerOverrides'];
  };

  return {
    controlValues: rest,
    providerOverrides: providerOverrides === undefined ? undefined : (providerOverrides ?? null),
  };
}

function toStepUpsertShape(step: StepResponseDto): StepUpdateDto {
  // Never coerce missing providerOverrides to null — omit means leave unchanged on the server.
  const { providerOverrides: _existingProviderOverrides, ...stepWithoutProviderOverrides } = step;

  return {
    ...stepWithoutProviderOverrides,
    controlValues: step.controls?.values || {},
  };
}

export const updateStepInWorkflow = (
  workflow: WorkflowResponseDto,
  stepId: string,
  updateStep: Partial<StepUpdateDto>
): UpdateWorkflowDto => {
  return {
    ...workflow,
    steps: workflow.steps.map((step) => {
      const stepWithoutProviderOverrides = toStepUpsertShape(step);

      if (step.stepId === stepId) {
        const existingControlValues = step.controls?.values || {};
        const incomingControlValues =
          updateStep.controlValues !== undefined ? updateStep.controlValues : existingControlValues;

        // Deleting control values also clears per-provider override docs (server cascade).
        if (incomingControlValues === null) {
          return {
            ...stepWithoutProviderOverrides,
            ...updateStep,
            controlValues: null,
            providerOverrides: null,
          };
        }

        // Form state nests providerOverrides beside control fields; lift to the step DTO sibling.
        const splitFromForm =
          updateStep.providerOverrides === undefined
            ? splitProviderOverridesFromControlValues(incomingControlValues as Record<string, unknown>)
            : { controlValues: incomingControlValues, providerOverrides: updateStep.providerOverrides };

        return {
          ...stepWithoutProviderOverrides,
          ...updateStep,
          controlValues: splitFromForm.controlValues,
          ...(splitFromForm.providerOverrides !== undefined
            ? { providerOverrides: splitFromForm.providerOverrides }
            : {}),
        };
      }

      return stepWithoutProviderOverrides;
    }),
  };
};

export const removeStepFromWorkflow = (
  workflow: WorkflowResponseDto,
  shouldKeep: (step: StepResponseDto) => boolean
): UpdateWorkflowDto => {
  return {
    ...workflow,
    steps: workflow.steps.filter(shouldKeep).map(toStepUpsertShape),
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

  if (type === StepTypeEnum.WAIT) {
    controlValue.amount = DEFAULT_CONTROL_WAIT_AMOUNT;
    controlValue.unit = DEFAULT_CONTROL_WAIT_UNIT;
  }

  if (type === StepTypeEnum.THROTTLE) {
    controlValue.type = DEFAULT_CONTROL_THROTTLE_TYPE;
    controlValue.amount = DEFAULT_CONTROL_THROTTLE_WINDOW;
    controlValue.unit = DEFAULT_CONTROL_THROTTLE_UNIT;
    controlValue.threshold = DEFAULT_CONTROL_THROTTLE_THRESHOLD;
  }

  if (type === StepTypeEnum.HTTP_REQUEST) {
    controlValue.method = DEFAULT_CONTROL_HTTP_REQUEST_METHOD;
    controlValue.headers = DEFAULT_CONTROL_HTTP_REQUEST_HEADERS;
    controlValue.body = DEFAULT_CONTROL_HTTP_REQUEST_BODY;
    controlValue.responseBodySchema = DEFAULT_CONTROL_HTTP_REQUEST_RESPONSE_BODY_SCHEMA;
    controlValue.enforceSchemaValidation = DEFAULT_CONTROL_HTTP_REQUEST_ENFORCE_SCHEMA_VALIDATION;
    controlValue.continueOnFailure = DEFAULT_CONTROL_HTTP_REQUEST_CONTINUE_ON_FAILURE;
    controlValue.timeout = DEFAULT_CONTROL_HTTP_REQUEST_TIMEOUT;
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
    name: `${STEP_TYPE_LABELS[type]} Step`,
    type,
    controlValues: controlValue,
  };
};
