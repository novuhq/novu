import {
  BuilderFieldType,
  BuilderGroupValues,
  ChannelTypeEnum,
  FilterParts,
  ICredentialsDto,
} from '@novu/shared';

export interface IConditions {
  isNegated: boolean;
  type: BuilderFieldType;
  value: BuilderGroupValues;
  children: FilterParts[];
}
export interface IIntegrations {
  getAll();
  create(providerId: string, data: IIntegrationsPayload);
  getActive();
  getWebhookProviderStatus(providerId: string);
  update(integrationId: string, data: IIntegrationsUpdatePayload);
  delete(integrationId: string);
  getInAppStatus();
  setIntegrationAsPrimary(integrationId: string);
}

export interface IIntegrationsPayload extends IIntegrationsUpdatePayload {
  channel: ChannelTypeEnum;
}

export interface IIntegrationsUpdatePayload {
  name?: string;
  identifier?: string;
  credentials?: ICredentialsDto;
  active?: boolean;
  check?: boolean;
  conditions?: IConditions[];
}
