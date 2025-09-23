import { CreateWorkflowDto } from '@novu/shared';

export type IWorkflowSuggestion = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  workflowDefinition: CreateWorkflowDto;
};

export type TemplateCategory = {
  id: string;
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  tag: string;
};
