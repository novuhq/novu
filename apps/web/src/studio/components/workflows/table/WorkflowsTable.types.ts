import type { DiscoverWorkflowOutput } from '@novu/framework';

export type WorkflowTableRow = Omit<DiscoverWorkflowOutput, 'controls' | 'inputs'>;
