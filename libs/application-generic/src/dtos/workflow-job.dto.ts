import {
  AddressingTypeEnum,
  StatelessControls,
  TriggerRecipientsPayload,
  TriggerRecipientSubscriber,
  TriggerRequestCategoryEnum,
  TriggerTenantContext,
} from '@novu/shared';
import { DiscoverWorkflowOutput } from '@novu/framework/internal';
import {
  IBulkJobParams,
  IJobParams,
} from '../services/queues/queue-base.service';

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
  identifier: string;
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  overrides: Record<string, Record<string, unknown>>;
  transactionId: string;
  actor?: TriggerRecipientSubscriber | null;
  tenant?: TriggerTenantContext | null;
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
