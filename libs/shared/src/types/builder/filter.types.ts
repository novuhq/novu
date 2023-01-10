import type { BuilderFieldOperator } from './builder.types';

export type FilterPartType = 'payload' | 'subscriber' | 'webhook' | 'isOnline' | 'isOnlineInLast';

export interface IBaseFilterPart {
  on: FilterPartType;
}

export interface IBaseFieldFilterPart extends IBaseFilterPart {
  field: string;
  value: string;
  operator: BuilderFieldOperator;
}

export interface IFieldFilterPart extends IBaseFieldFilterPart {
  on: 'subscriber' | 'payload';
}

export interface IWebhookFilterPart extends IBaseFieldFilterPart {
  on: 'webhook';
  webhookUrl?: string;
}

export interface IRealtimeOnlineFilterPart extends IBaseFilterPart {
  on: 'isOnline';
  value: boolean;
}

export interface IOnlineInLastFilterPart extends IBaseFilterPart {
  on: 'isOnlineInLast';
  timeOperator: 'minutes' | 'hours' | 'days';
  value: number;
}

export type FilterParts = IFieldFilterPart | IWebhookFilterPart | IRealtimeOnlineFilterPart | IOnlineInLastFilterPart;
