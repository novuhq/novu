import { useLocation } from 'react-router-dom';
import { useWorkflowEditorContext } from '@/components/command-palette/hooks/use-workflow-editor-context';
import { getHelpPage, type HelpPage, WORKFLOW_EDITOR_PAGE } from './help-panel-content';

export function useHelpPage(): HelpPage {
  const { pathname } = useLocation();
  const { workflow } = useWorkflowEditorContext();
  const page = getHelpPage(pathname);

  if (page !== WORKFLOW_EDITOR_PAGE || !workflow?.name) {
    return page;
  }

  return {
    ...WORKFLOW_EDITOR_PAGE,
    context: {
      ...WORKFLOW_EDITOR_PAGE.context,
      label: workflow.name,
      assistantContext: `I'm editing the "${workflow.name}" workflow in the Novu dashboard workflow editor.`,
    },
  };
}
