import { FilterPartTypeEnum } from '../../types';

export const FILTER_TO_LABEL = {
  [FilterPartTypeEnum.PAYLOAD]: 'Payload',
  [FilterPartTypeEnum.TENANT]: 'Tenant',
  [FilterPartTypeEnum.SUBSCRIBER]: 'Subscriber',
  [FilterPartTypeEnum.WEBHOOK]: 'Webhook',
  [FilterPartTypeEnum.IS_ONLINE]: 'Is online',
  [FilterPartTypeEnum.IS_ONLINE_IN_LAST]: 'Last time was online',
  [FilterPartTypeEnum.PREVIOUS_STEP]: 'Previous step',
};
