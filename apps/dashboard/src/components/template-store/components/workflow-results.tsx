import { IWorkflowSuggestion } from '../templates/types';
import { WorkflowMode } from '../types';
import { WorkflowCard } from '../workflow-card';

type WorkflowResultsProps = {
  mode: WorkflowMode;
  suggestions: IWorkflowSuggestion[];
  onClick: (template: IWorkflowSuggestion) => void;
};

export function WorkflowResults({ mode, suggestions, onClick }: WorkflowResultsProps) {
  return (
    <div
      className={`grid ${
        mode === WorkflowMode.FROM_PROMPT ? 'mx-auto w-full max-w-xl grid-cols-1' : 'grid-cols-3'
      } gap-4`}
    >
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
