export const INTEGRATION_CONDITION_NAMESPACES = ['context.', 'subscriber.'] as const;

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
