export const INTEGRATION_CONDITION_NAMESPACES = ['context.', 'subscriber.'] as const;

/**
 * Namespaces accepted when evaluating already-persisted rules at send time.
 * `payload.*` is no longer writable, but saved rules such as `payload.region` must still match.
 */
export const INTEGRATION_CONDITION_RUNTIME_NAMESPACES = [...INTEGRATION_CONDITION_NAMESPACES, 'payload.'] as const;

export const INTEGRATION_CONDITION_VARIABLES = [
  'context.tenant.id',
  'subscriber.subscriberId',
  'subscriber.email',
  'subscriber.phone',
  'subscriber.firstName',
  'subscriber.lastName',
  'subscriber.locale',
  'subscriber.data',
  'workflow.workflowId',
  'workflow.name',
  'workflow.description',
  'workflow.tags',
  'workflow.severity',
] as const;

export type IntegrationConditionVariableName = (typeof INTEGRATION_CONDITION_VARIABLES)[number];
