import { DeliveryLifecycleStatusEnum } from '@novu/shared';

export const DELIVERY_LIFECYCLE_ORDER: Record<DeliveryLifecycleStatusEnum, number> = {
  [DeliveryLifecycleStatusEnum.PENDING]: 0,
  [DeliveryLifecycleStatusEnum.SENT]: 1,
  [DeliveryLifecycleStatusEnum.DELIVERED]: 2,
  [DeliveryLifecycleStatusEnum.INTERACTED]: 3,
  [DeliveryLifecycleStatusEnum.SKIPPED]: -1,
  [DeliveryLifecycleStatusEnum.CANCELED]: -1,
  [DeliveryLifecycleStatusEnum.ERRORED]: -1,
  [DeliveryLifecycleStatusEnum.MERGED]: -1,
};

export const TERMINAL_STATUSES = [
  DeliveryLifecycleStatusEnum.SKIPPED,
  DeliveryLifecycleStatusEnum.CANCELED,
  DeliveryLifecycleStatusEnum.ERRORED,
  DeliveryLifecycleStatusEnum.MERGED,
  DeliveryLifecycleStatusEnum.INTERACTED,
];

export function isTerminalStatus(status: DeliveryLifecycleStatusEnum): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function getStatusOrder(status: DeliveryLifecycleStatusEnum): number {
  return DELIVERY_LIFECYCLE_ORDER[status];
}
