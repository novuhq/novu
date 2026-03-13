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
  AI = 'ai',
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

export enum TriggerContextTypeEnum {
  TENANT = 'tenant',
  ACTOR = 'actor',
}
