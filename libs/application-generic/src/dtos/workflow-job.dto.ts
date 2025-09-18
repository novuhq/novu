import { DiscoverWorkflowOutput } from '@novu/framework/internal';
import {
  AddressingTypeEnum,
  ContextPayload,
  StatelessControls,
  TriggerOverrides,
  TriggerRecipientSubscriber,
  TriggerRecipientsPayload,
  TriggerRequestCategoryEnum,
  TriggerTenantContext,
} from '@novu/shared';
import { IBulkJobParams, IJobParams } from '../services/queues/queue-base.service';

export type AddressingBroadcast = {
  addressingType: AddressingTypeEnum.BROADCAST;
};

export type AddressingMulticast = {
  to: TriggerRecipientsPayload;
  addressingType: AddressingTypeEnum.MULTICAST;
};

type Addressing = AddressingBroadcast | AddressingMulticast;

export type IWorkflowDataDto = {
  environmentId: string;
  organizationId: string;
  userId: string;
  // TODO: remove optional flag after all the workers are migrated to use requestId NV-6475
  requestId?: string;
  identifier: string;
  payload: any;
  overrides: TriggerOverrides;
  transactionId: string;
  actor?: TriggerRecipientSubscriber | null;
  tenant?: TriggerTenantContext | null;
  context?: ContextPayload;
  requestCategory?: TriggerRequestCategoryEnum;
  bridgeUrl?: string;
  bridgeWorkflow?: DiscoverWorkflowOutput;
  controls?: StatelessControls;
} & Addressing;

export interface IWorkflowJobDto extends IJobParams {
  data?: IWorkflowDataDto;
}

export interface IWorkflowBulkJobDto extends IBulkJobParams {
  data: IWorkflowDataDto;
}
