export type DeliveryLifecycleEventType =
  | 'workflow_run_delivery_pending'
  | 'workflow_run_delivery_sent'
  | 'workflow_run_delivery_errored'
  | 'workflow_run_delivery_skipped'
  | 'workflow_run_delivery_canceled'
  | 'workflow_run_delivery_merged'
  | 'workflow_run_delivery_delivered'
  | 'workflow_run_delivery_interacted';
