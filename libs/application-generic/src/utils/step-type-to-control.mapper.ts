import { ControlSchemas, JSONSchemaEntity } from '@novu/dal';
import { ActionStepEnum, ChannelStepEnum } from '@novu/framework/internal';
import { httpRequestControlSchema, httpRequestUiSchema, ResourceOriginEnum, StepTypeEnum } from '@novu/shared';
import {
  chatControlSchema,
  chatUiSchema,
  delayControlSchema,
  delayUiSchema,
  digestControlSchema,
  digestUiSchema,
  emailControlSchema,
  emailUiSchema,
  inAppControlSchema,
  inAppUiSchema,
  pushControlSchema,
  pushUiSchema,
  smsControlSchema,
  smsUiSchema,
  throttleControlSchema,
  throttleUiSchema,
  toolControlSchema,
  toolUiSchema,
} from '../schemas/control';
import { isStepResolverActive } from './step-resolver-control-state';

export const PERMISSIVE_EMPTY_SCHEMA = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: true,
} as JSONSchemaEntity;

type ControlSchemaStepType = ChannelStepEnum | ActionStepEnum;

const stepTypeToControlSchemaMap: Record<ControlSchemaStepType, ControlSchemas> = {
  [ChannelStepEnum.IN_APP]: {
    schema: inAppControlSchema,
    uiSchema: inAppUiSchema,
  },
  [ChannelStepEnum.EMAIL]: {
    schema: emailControlSchema,
    uiSchema: emailUiSchema,
  },
  [ChannelStepEnum.SMS]: {
    schema: smsControlSchema,
    uiSchema: smsUiSchema,
  },
  [ChannelStepEnum.PUSH]: {
    schema: pushControlSchema,
    uiSchema: pushUiSchema,
  },
  [ChannelStepEnum.CHAT]: {
    schema: chatControlSchema,
    uiSchema: chatUiSchema,
  },
  [ChannelStepEnum.TOOL]: {
    schema: toolControlSchema,
    uiSchema: toolUiSchema,
  },
  [ActionStepEnum.DELAY]: {
    schema: delayControlSchema,
    uiSchema: delayUiSchema,
  },
  [ActionStepEnum.DIGEST]: {
    schema: digestControlSchema,
    uiSchema: digestUiSchema,
  },
  [ActionStepEnum.THROTTLE]: {
    schema: throttleControlSchema,
    uiSchema: throttleUiSchema,
  },
  [ActionStepEnum.CUSTOM]: {
    schema: PERMISSIVE_EMPTY_SCHEMA,
  },
  [ActionStepEnum.HTTP_REQUEST]: {
    schema: httpRequestControlSchema as unknown as JSONSchemaEntity,
    uiSchema: httpRequestUiSchema,
  },
};

export const stepTypeToControlSchema = stepTypeToControlSchemaMap as Record<ControlSchemaStepType, ControlSchemas>;

function isDashboardCloudOrigin(workflowOrigin: ResourceOriginEnum): boolean {
  return workflowOrigin === ResourceOriginEnum.NOVU_CLOUD || workflowOrigin === ResourceOriginEnum.NOVU_CLOUD_V1;
}

/**
 * Dashboard cloud steps must validate/persist against the current canonical control
 * schema so product schema changes take effect.
 * Code-first / step-resolver steps keep their discovered or stored schema.
 */
export function resolveStepControlSchemas({
  stepType,
  workflowOrigin,
  existingControls,
  stepResolverHash,
}: {
  stepType: StepTypeEnum | ControlSchemaStepType;
  workflowOrigin: ResourceOriginEnum;
  existingControls?: ControlSchemas | null;
  stepResolverHash?: string;
}): ControlSchemas {
  const canonical = stepTypeToControlSchema[stepType as ControlSchemaStepType];

  if (isDashboardCloudOrigin(workflowOrigin) && !isStepResolverActive(stepResolverHash)) {
    return canonical ?? existingControls ?? { schema: PERMISSIVE_EMPTY_SCHEMA };
  }

  return existingControls || canonical || { schema: PERMISSIVE_EMPTY_SCHEMA };
}
