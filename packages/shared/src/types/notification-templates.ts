import { ChannelTypeEnum } from './channel';

export enum WorkflowCreationSourceEnum {
  TEMPLATE_STORE = 'template_store',
  EDITOR = 'editor',
  NOTIFICATION_DIRECTORY = 'notification_directory',
  ONBOARDING_DIGEST_DEMO = 'onboarding_digest_demo',
  ONBOARDING_IN_APP = 'onboarding_in_app',
  EMPTY_STATE = 'empty_state',
  DROPDOWN = 'dropdown',
  ONBOARDING_GET_STARTED = 'onboarding_get_started',
  BRIDGE = 'bridge',
  DASHBOARD = 'dashboard',
}

export type WorkflowIntegrationStatus = {
  hasActiveIntegrations: boolean;
  hasPrimaryIntegrations?: boolean;
  channels: WorkflowChannelsIntegrationStatus;
};

export type WorkflowChannelsIntegrationStatus = ActiveIntegrationsStatus & ActiveIntegrationStatusWithPrimary;

type ActiveIntegrationsStatus = {
  [key in ChannelTypeEnum]: {
    hasActiveIntegrations: boolean;
  };
};

type ActiveIntegrationStatusWithPrimary = {
  [ChannelTypeEnum.EMAIL]: {
    hasActiveIntegrations: boolean;
    hasPrimaryIntegrations: boolean;
  };
  [ChannelTypeEnum.SMS]: {
    hasActiveIntegrations: boolean;
    hasPrimaryIntegrations: boolean;
  };
};

/**
 * Enum to define the type of the workflow.
 *
 * One of its responsibilities is to help the API determine whether "changes" need to be created during the upsert process.
 */
export enum WorkflowTypeEnum {
  REGULAR = 'REGULAR',
  ECHO = 'ECHO', // @deprecated
  BRIDGE = 'BRIDGE',
}
/**
 * Enum to define the origin of the workflow.
 *
 * The `WorkflowOriginEnum` is used to specify the source of the workflow,
 * which helps determine which endpoint to call during the Preview & Execution phase.
 * * - 'novu-cloud' indicates that the workflow originates from Novu's platform, so the Novu-hosted endpoint is used.
 * * - 'external' indicates that the workflow originates from an external source, requiring a call to a customer-hosted Bridge endpoint.
 */
export enum WorkflowOriginEnum {
  NOVU_CLOUD = 'novu-cloud',
  NOVU_CLOUD_V1 = 'novu-cloud-v1',
  EXTERNAL = 'external',
}

export enum TriggerContextTypeEnum {
  TENANT = 'tenant',
  ACTOR = 'actor',
}
