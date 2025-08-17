import { PermissionsEnum } from '@novu/shared';
import { RiFileAddLine, RiRouteFill } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { useFetchWorkflows } from '@/hooks/use-fetch-workflows';
import { useHasPermission } from '@/hooks/use-has-permission';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Command, CommandExecutionContext } from '../command-types';

export function useWorkflowCommands(context: CommandExecutionContext): Command[] {
  const navigate = useNavigate();
  const hasWorkflowWrite = useHasPermission();

  const { data: workflowsData } = useFetchWorkflows({
    limit: 50,
    offset: 0,
  });

  const commands: Command[] = [];

  // Create new workflow
  if (hasWorkflowWrite({ permission: PermissionsEnum.WORKFLOW_WRITE }) && context.environmentSlug) {
    commands.push({
      id: 'workflow-create',
      label: 'Create New Workflow',
      description: 'Create a new workflow from scratch',
      category: 'workflow',
      icon: <RiFileAddLine />,
      priority: 'high',
      keywords: ['create', 'new', 'workflow', 'add'],
      execute: () => {
        if (context.environmentSlug) {
          navigate(buildRoute(ROUTES.WORKFLOWS_CREATE, { environmentSlug: context.environmentSlug }));
        }
      },
      isVisible: () => hasWorkflowWrite({ permission: PermissionsEnum.WORKFLOW_WRITE }) && !!context.environmentSlug,
    });
  }

  // Add individual workflow commands (will only show when searching)
  if (context.environmentSlug && workflowsData?.workflows) {
    for (const workflow of workflowsData.workflows) {
      commands.push({
        id: `workflow-edit-${workflow.workflowId}`,
        label: workflow.name,
        description: `Open ${workflow.name} workflow for editing`,
        category: 'workflow',
        icon: <RiRouteFill />,
        priority: 'low', // Lower priority so main workflow commands appear first
        keywords: ['edit', 'workflow', workflow.name, workflow.workflowId, 'open'],
        metadata: {
          slug: workflow.slug,
          workflowId: workflow.workflowId,
        },
        execute: () => {
          if (context.environmentSlug && workflow.slug) {
            navigate(
              buildRoute(ROUTES.EDIT_WORKFLOW, {
                environmentSlug: context.environmentSlug,
                workflowSlug: workflow.slug,
              })
            );
          }
        },
      });
    }
  }

  return commands;
}
