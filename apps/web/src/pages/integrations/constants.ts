import { ChannelTypeEnum } from '@novu/shared';

export enum IntegrationsStoreModalAnalytics {
  CREATE_INTEGRATION_FORM_SUBMIT = 'Create Integration Form Submit - [Integrations Store Modal]',
  UPDATE_INTEGRATION_FORM_SUBMIT = 'Update Integration Form Submit - [Integrations Store Modal]',
  SELECT_PROVIDER_CLICK = 'Select Provider Click - [Integrations Store Modal]',
  CLOSE_MODAL = 'Close Modal - [Integrations Store Modal]',
}

export const CHANNEL_TYPE_TO_ICON_NAME = {
  [ChannelTypeEnum.EMAIL]: 'envelope',
  [ChannelTypeEnum.SMS]: 'message',
  [ChannelTypeEnum.PUSH]: 'mobile',
  [ChannelTypeEnum.CHAT]: 'paper-plane',
  [ChannelTypeEnum.IN_APP]: 'bell',
};
