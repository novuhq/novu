import { CreateWorkflowDto } from '@novu/shared';

export type IWorkflowSuggestion = {
  id: string;
  name: string;
  description: string;
  category: 'events' | 'authentication' | 'social' | 'operational' | 'billing' | 'security';
  workflowDefinition: CreateWorkflowDto;
};
