import { IWorkflowSuggestion } from '../types';
import { WorkflowCard } from '../workflow-card';

type WorkflowResultsProps = {
  suggestions: IWorkflowSuggestion[];
  onClick: (template: IWorkflowSuggestion) => void;
};

export function WorkflowResults({ suggestions, onClick }: WorkflowResultsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {suggestions.map((template) => {
        return (
          <WorkflowCard
            onClick={() => {
              onClick(template);
            }}
            key={template.id}
            name={template.name}
            description={template.description || ''}
            steps={template.workflowDefinition.steps.map((step) => step.type)}
          />
        );
      })}
    </div>
  );
}
