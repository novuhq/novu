import { EmailProviderIdEnum, PermissionsEnum, type WorkflowAgentConfig, WorkflowResponseDto } from '@novu/shared';
import { motion } from 'motion/react';
import { RiArrowLeftSLine, RiArrowRightSLine, RiCloseFill, RiExternalLinkLine, RiInformationLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/page-meta';
import { CompactButton } from '@/components/primitives/button-compact';
import { Separator } from '@/components/primitives/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { SidebarContent, SidebarHeader } from '@/components/side-navigation/sidebar';
import { WorkflowAgentConnectedChannels } from '@/components/workflow-editor/workflow-agent-connected-channels';
import { WorkflowAgentEmailReplyTo } from '@/components/workflow-editor/workflow-agent-email-reply-to';
import { WorkflowAgentSelect } from '@/components/workflow-editor/workflow-agent-select';
import { UpdateWorkflowFn } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useAgentRoutes } from '@/hooks/use-agent-routes';
import { useHasPermission } from '@/hooks/use-has-permission';
import { buildRoute } from '@/utils/routes';
import { cn } from '@/utils/ui';

const AGENT_TRIGGER_DOCS_URL = 'https://docs.novu.co/agents/get-started/mental-model';

type WorkflowAgentAssignmentFormProps = {
  workflow: WorkflowResponseDto;
  update: UpdateWorkflowFn;
  isReadOnly?: boolean;
};

export function WorkflowAgentAssignmentForm({ workflow, update, isReadOnly }: WorkflowAgentAssignmentFormProps) {
  const { currentEnvironment } = useEnvironment();
  const agentRoutes = useAgentRoutes();
  const has = useHasPermission();
  const canReadAgents = has({ permission: PermissionsEnum.AGENT_READ });
  const canWriteWorkflow = has({ permission: PermissionsEnum.WORKFLOW_WRITE });
  const isDisabled = Boolean(isReadOnly) || !canWriteWorkflow || !canReadAgents;
  const agentIdentifier = workflow.agent?.identifier ?? null;
  const replyTo = workflow.agent?.providers?.[EmailProviderIdEnum.NovuAgent]?.replyTo;

  const handleAgentChange = (nextIdentifier: string | null) => {
    update((current) => ({
      ...current,
      agent: nextIdentifier ? { identifier: nextIdentifier } : null,
    }));
  };

  const handleReplyToChange = (nextReplyTo: string) => {
    if (!agentIdentifier) {
      return;
    }

    const nextAgent: WorkflowAgentConfig = {
      identifier: agentIdentifier,
      providers: {
        ...workflow.agent?.providers,
        [EmailProviderIdEnum.NovuAgent]: {
          ...workflow.agent?.providers?.[EmailProviderIdEnum.NovuAgent],
          replyTo: nextReplyTo,
        },
      },
    };

    update((current) => ({
      ...current,
      agent: nextAgent,
    }));
  };

  return (
    <>
      <PageMeta title={workflow.name} />
      <motion.div
        className={cn('relative flex h-full w-full flex-col')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0.1 }}
        transition={{ duration: 0.1 }}
      >
        <SidebarHeader className="items-center border-b py-3 text-sm font-medium">
          <Link to="../" className="flex items-center">
            <CompactButton icon={RiArrowLeftSLine} variant="ghost" size="md" type="button">
              <span className="sr-only">Back</span>
            </CompactButton>
          </Link>
          <span>Send & reply via agent</span>
          <Link to="../" className="ml-auto flex items-center">
            <CompactButton icon={RiCloseFill} variant="ghost" type="button">
              <span className="sr-only">Close</span>
            </CompactButton>
          </Link>
        </SidebarHeader>

        <SidebarContent size="md">
          <p className="text-text-soft text-label-xs leading-4">
            Send this workflow&apos;s notifications through an agent&apos;s connected channels. Replies route back to
            that agent automatically.
          </p>
        </SidebarContent>

        <SidebarContent size="md" className="gap-1.5">
          <div className="flex w-full items-center gap-px">
            <span className="text-text-sub text-label-xs font-medium">Agent</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-text-soft inline-flex size-4 items-center justify-center">
                  <RiInformationLine className="size-3.5" />
                  <span className="sr-only">About agent assignment</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Assign a default agent for this workflow. You can still override the agent per trigger later.
              </TooltipContent>
            </Tooltip>
            {canReadAgents && currentEnvironment?.slug ? (
              <Link
                to={buildRoute(agentRoutes.list, { environmentSlug: currentEnvironment.slug })}
                className="text-text-strong text-label-xs ml-auto font-medium"
              >
                Manage agents
              </Link>
            ) : null}
          </div>
          <WorkflowAgentSelect value={agentIdentifier} onChange={handleAgentChange} disabled={isDisabled} />
          {!canReadAgents ? (
            <p className="text-text-soft text-label-2xs leading-4">
              You don&apos;t have permission to view agents. The saved assignment is preserved but cannot be changed.
            </p>
          ) : null}
        </SidebarContent>

        <Separator />
        <div className="bg-bg-weak flex items-center px-3 py-0.5">
          <p className="text-text-soft flex-1 text-[10px] font-normal leading-3.5 tracking-wide uppercase">
            Connected channels
          </p>
        </div>
        <WorkflowAgentConnectedChannels agentIdentifier={agentIdentifier} />
        {canReadAgents && currentEnvironment?.slug && agentIdentifier ? (
          <Link
            to={buildRoute(agentRoutes.detailsTab, {
              environmentSlug: currentEnvironment.slug,
              agentIdentifier: encodeURIComponent(agentIdentifier),
              agentTab: 'integrations',
            })}
            className="text-text-strong mx-3 mb-2 flex w-fit items-center gap-1 text-label-xs font-medium"
          >
            Manage Integrations
            <RiArrowRightSLine className="size-4" />
          </Link>
        ) : null}

        {agentIdentifier ? (
          <WorkflowAgentEmailReplyTo
            agentIdentifier={agentIdentifier}
            value={replyTo}
            onChange={handleReplyToChange}
            disabled={isDisabled}
          />
        ) : null}

        <div className="mt-auto px-3 pb-4 pt-2">
          <div className="bg-bg-weak border-stroke-weak flex gap-3 overflow-hidden rounded-lg border px-3 py-2.5">
            <div className="bg-faded-base w-1 shrink-0 self-stretch rounded-full" />
            <p className="text-text-sub text-paragraph-xs min-w-0 flex-1 leading-4">
              <span className="font-medium">Note:</span> Need a different agent per notification? Set{' '}
              <span className="font-code text-[12px] font-medium tracking-tight">agent.identifier</span> at the time of
              trigger instead.{' '}
              <a
                href={AGENT_TRIGGER_DOCS_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="text-text-sub inline-flex items-center gap-0.5 font-medium hover:underline"
              >
                Read docs
                <RiExternalLinkLine className="size-3" />
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
}
