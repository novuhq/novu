import { useEnvironment, useFetchEnvironments } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useTelemetry } from '@/hooks/use-telemetry';
import { StepTypeEnum } from '@/utils/enums';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { Step } from '@/utils/types';
import { useUser } from '@clerk/clerk-react';
import { ChannelTypeEnum, WorkflowResponseDto } from '@novu/shared';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import {
  RiArrowRightDoubleFill,
  RiCheckboxCircleFill,
  RiCloseLine,
  RiLoader3Line,
  RiSparkling2Fill,
} from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/ui';
import { Badge, BadgeIcon } from '../primitives/badge';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '../primitives/popover';
import { useWorkflow } from './workflow-provider';

interface WorkflowChecklistProps {
  steps: Step[];
  workflow: WorkflowResponseDto;
}

type ChecklistItem = {
  title: string;
  isCompleted: (steps: Step[]) => boolean;
  onClick: () => void;
};

export function WorkflowChecklist({ steps, workflow }: WorkflowChecklistProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();
  const { currentEnvironment } = useEnvironment();
  const { integrations } = useFetchIntegrations();
  const { environments = [] } = useFetchEnvironments({ organizationId: currentEnvironment?._id });
  const checklistItems = useChecklistItems(steps);
  const telemetry = useTelemetry();

  useEffect(() => {
    const allItemsCompleted = checklistItems.every((item) => item.isCompleted(steps));
    const isFinishedLoading = currentEnvironment && workflow && integrations && environments;

    if (isFinishedLoading) {
      if (allItemsCompleted) {
        setIsOpen(false);

        telemetry(TelemetryEvent.WORKFLOW_CHECKLIST_COMPLETED, {
          workflowId: workflow?.workflowId,
        });

        if (user) {
          user.update({
            unsafeMetadata: {
              ...user.unsafeMetadata,
              workflowChecklistCompleted: true,
            },
          });
        }
      } else {
        setIsOpen(true);
      }
    }
  }, [steps, checklistItems, currentEnvironment, workflow, integrations, environments, user, telemetry]);

  const handleOpenChange = (open: boolean) => {
    if (open === false) return;
    setIsOpen(open);

    telemetry(TelemetryEvent.WORKFLOW_CHECKLIST_OPENED, {
      workflowId: workflow?.workflowId,
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button type="button" className="absolute bottom-[18px] left-[18px]">
          <Badge color="red" size="md" variant="lighter" className="cursor-pointer">
            <motion.div
              variants={{
                initial: { scale: 1, rotate: 0, opacity: 1 },
                hover: {
                  scale: [1, 1.1, 1],
                  rotate: [0, 4, -4, 0],
                  opacity: [0, 1, 1],
                  transition: {
                    duration: 1.4,
                    repeat: 0,
                    ease: 'easeInOut',
                  },
                },
              }}
            >
              <BadgeIcon as={RiSparkling2Fill} />
            </motion.div>
            <span className="text-xs">
              {checklistItems.filter((item) => item.isCompleted(steps)).length}/{checklistItems.length}
            </span>
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" alignOffset={0} align="start" className="w-[325px] p-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-foreground-900 text-label-sm mb-1 font-medium">Actions Recommended</h3>
            <p className="text-text-soft text-paragraph-xs mb-3">
              Let's make sure you have everything you need to send notifications to your users
            </p>
          </div>
          <PopoverClose asChild>
            <button
              type="button"
              className="text-text-soft hover:text-text-sub -mr-1 -mt-1 rounded-sm p-1 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <RiCloseLine className="h-4 w-4" />
            </button>
          </PopoverClose>
        </div>
        <div className="bg-bg-weak rounded-8 flex flex-col gap-3 p-1.5">
          {checklistItems.map((item, index) => (
            <ChecklistItemButton key={index} item={item} steps={steps} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function useChecklistItems(steps: Step[]) {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const { workflow } = useWorkflow();
  const { integrations } = useFetchIntegrations();
  const telemetry = useTelemetry();

  const foundInAppIntegration = integrations?.find(
    (integration) =>
      integration._environmentId === currentEnvironment?._id && integration.channel === ChannelTypeEnum.IN_APP
  );

  return useMemo(
    () => [
      {
        title: 'Add a step',
        isCompleted: (steps: Step[]) => steps.length > 0,
        onClick: () => {
          telemetry(TelemetryEvent.WORKFLOW_CHECKLIST_STEP_CLICKED, { stepTitle: 'Add a step' });
          if (steps.length === 0) {
            const addStepButton = document.querySelector('[data-test-id="add-step-button"]');
            if (addStepButton instanceof HTMLElement) {
              addStepButton.click();
            }
          }
        },
      },
      {
        title: 'Add notification content',
        isCompleted: (steps: Step[]) =>
          steps.some((step: Step) => step.type !== StepTypeEnum.TRIGGER && step.controls?.values),
        onClick: () => {
          telemetry(TelemetryEvent.WORKFLOW_CHECKLIST_STEP_CLICKED, { stepTitle: 'Add notification content' });
          const stepToConfig = steps.find((step) => step.type !== StepTypeEnum.TRIGGER);

          if (stepToConfig) {
            navigate(
              buildRoute(ROUTES.EDIT_STEP_TEMPLATE, {
                environmentSlug: currentEnvironment?.slug ?? '',
                workflowSlug: workflow?.slug ?? '',
                stepSlug: stepToConfig.slug,
              })
            );
          }
        },
      },
      ...(steps.some((step) => step.type === StepTypeEnum.IN_APP)
        ? [
            {
              title: 'Integrate Inbox into your app',
              isCompleted: () => foundInAppIntegration?.connected ?? false,
              onClick: () => {
                telemetry(TelemetryEvent.WORKFLOW_CHECKLIST_STEP_CLICKED, {
                  stepTitle: 'Integrate Inbox into your app',
                });
                navigate(`${ROUTES.INBOX_EMBED}?environmentId=${currentEnvironment?._id}`);
              },
            },
          ]
        : []),
      {
        key: 'trigger',
        title: 'Trigger workflow',
        description: 'Trigger the workflow to test it in production',
        isCompleted: () => !!workflow?.lastTriggeredAt,
        onClick: () => {
          telemetry(TelemetryEvent.WORKFLOW_CHECKLIST_STEP_CLICKED, { stepTitle: 'Trigger workflow' });
          navigate(
            buildRoute(ROUTES.TEST_WORKFLOW, {
              environmentSlug: currentEnvironment?.slug ?? '',
              workflowSlug: workflow?.slug ?? '',
            })
          );
        },
        link: {
          text: 'Learn how to trigger',
          url: 'https://docs.novu.co/platform/triggers',
        },
      },
    ],
    [currentEnvironment, workflow, foundInAppIntegration, navigate, steps, telemetry]
  );
}

function ChecklistItemButton({ item, steps }: { item: ChecklistItem; steps: Step[] }) {
  return (
    <button
      type="button"
      className="hover:bg-background group flex w-full items-center gap-1 rounded-md transition-colors duration-200"
      onClick={item.onClick}
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]">
        <div className="flex items-center justify-center">
          {item.isCompleted(steps) ? (
            <RiCheckboxCircleFill className="text-success h-4 w-4" />
          ) : (
            <RiLoader3Line className="text-text-soft h-4 w-4" />
          )}
        </div>
      </div>
      <div className="text-label-xs text-text-sub">
        <span className={cn(item.isCompleted(steps) && 'line-through')}>{item.title}</span>
      </div>

      <RiArrowRightDoubleFill className="text-text-soft ml-auto h-4 w-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
    </button>
  );
}
