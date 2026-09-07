import type { StepResponseDto } from '@novu/shared';
import { RiEditLine, RiPlayFill, RiSettings4Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { StepTypeEnum } from '@/utils/enums';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Command, CommandExecutionContext } from '../command-types';

const DELIVERY_CHANNEL_STEPS = [
  StepTypeEnum.EMAIL,
  StepTypeEnum.SMS,
  StepTypeEnum.PUSH,
  StepTypeEnum.IN_APP,
  StepTypeEnum.CHAT,
];

function isDeliveryChannelStep(stepType: string): boolean {
  return DELIVERY_CHANNEL_STEPS.includes(stepType as StepTypeEnum);
}

export function useWorkflowEditorCommands(context: CommandExecutionContext): Command[] {
  const navigate = useNavigate();
  const commands: Command[] = [];

  const { workflowContext } = context;
  const { workflow, isInWorkflowEditor } = workflowContext || {};

  // Early return if not in workflow editor context
  if (!isInWorkflowEditor || !context.environmentSlug || !workflow) {
    return commands;
  }

  commands.push({
    id: 'trigger-current-workflow',
    label: `Trigger current workflow`,
    description: `Test and trigger the ${workflow.name} workflow`,
    category: 'current-workflow',
    icon: <RiPlayFill />,
    priority: 'high',
    keywords: ['trigger', 'test', 'run', workflow.name, 'workflow'],
    execute: () => {
      if (context.environmentSlug) {
        navigate(
          buildRoute(ROUTES.TRIGGER_WORKFLOW, {
            environmentSlug: context.environmentSlug,
            workflowSlug: workflow.slug,
          })
        );
      }
    },
  });

  // Workflow preferences command
  commands.push({
    id: 'edit-workflow-preferences',
    label: `Edit workflow preferences`,
    description: `Configure preferences for the workflow`,
    category: 'current-workflow',
    icon: <RiSettings4Line />,
    priority: 'medium',
    keywords: ['preferences', 'settings', 'configure', workflow.name],
    execute: () => {
      if (context.environmentSlug) {
        navigate(
          buildRoute(ROUTES.EDIT_WORKFLOW, {
            environmentSlug: context.environmentSlug,
            workflowSlug: workflow.slug,
          }) + '/preferences'
        );
      }
    },
  });

  // Edit step commands for each step
  if (workflow.steps && Array.isArray(workflow.steps) && workflow.steps.length > 0) {
    for (const workflowStep of workflow.steps as StepResponseDto[]) {
      // Skip if step doesn't have required properties
      if (!workflowStep.stepId || !workflowStep.slug) {
        continue;
      }

      const stepName = workflowStep.name || `${workflowStep.type} step`;

      commands.push({
        id: `edit-step-${workflowStep.stepId}`,
        label: `Edit ${stepName}`,
        description: `Edit the ${stepName} configuration`,
        category: 'current-workflow',
        icon: <RiEditLine />,
        priority: 'medium',
        keywords: ['edit', 'step', stepName, workflowStep.type],
        metadata: {
          stepId: workflowStep.stepId,
          stepSlug: workflowStep.slug,
        },
        execute: () => {
          if (context.environmentSlug) {
            const basePath =
              buildRoute(ROUTES.EDIT_WORKFLOW, {
                environmentSlug: context.environmentSlug,
                workflowSlug: workflow.slug,
              }) + `/steps/${workflowStep.slug}`;

            const finalPath = isDeliveryChannelStep(workflowStep.type) ? `${basePath}/editor` : basePath;

            navigate(finalPath);
          }
        },
      });
    }
  }

  return commands;
}
