import { ChannelTypeEnum } from '../channel';
import { CustomDataType } from '../shared';

export type NotificationTemplateCustomData = CustomDataType;

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
