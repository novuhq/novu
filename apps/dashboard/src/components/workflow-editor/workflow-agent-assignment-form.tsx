import { PermissionsEnum, WorkflowResponseDto } from '@novu/shared';
import { motion } from 'motion/react';
import { RiArrowLeftSLine, RiCloseFill, RiInformationLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/page-meta';
import { CompactButton } from '@/components/primitives/button-compact';
import { Separator } from '@/components/primitives/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { SidebarContent, SidebarHeader } from '@/components/side-navigation/sidebar';
import { WorkflowAgentConnectedChannels } from '@/components/workflow-editor/workflow-agent-connected-channels';
import { WorkflowAgentSelect } from '@/components/workflow-editor/workflow-agent-select';
import { UpdateWorkflowFn } from '@/components/workflow-editor/workflow-provider';
import { useHasPermission } from '@/hooks/use-has-permission';
import { cn } from '@/utils/ui';

type WorkflowAgentAssignmentFormProps = {
  workflow: WorkflowResponseDto;
  update: UpdateWorkflowFn;
  isReadOnly?: boolean;
};

export function WorkflowAgentAssignmentForm({ workflow, update, isReadOnly }: WorkflowAgentAssignmentFormProps) {
  const has = useHasPermission();
  const canReadAgents = has({ permission: PermissionsEnum.AGENT_READ });
  const canWriteWorkflow = has({ permission: PermissionsEnum.WORKFLOW_WRITE });
  const isDisabled = Boolean(isReadOnly) || !canWriteWorkflow || !canReadAgents;

  const handleAgentChange = (agentIdentifier: string | null) => {
    update((current) => ({
      ...current,
      agentId: agentIdentifier,
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
          <div className="flex items-center gap-px">
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
          </div>
          <WorkflowAgentSelect value={workflow.agentId} onChange={handleAgentChange} disabled={isDisabled} />
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
        <WorkflowAgentConnectedChannels workflow={workflow} agentIdentifier={workflow.agentId} />
      </motion.div>
    </>
  );
}
