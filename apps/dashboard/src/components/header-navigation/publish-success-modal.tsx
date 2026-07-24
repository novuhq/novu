import type { IEnvironment } from '@novu/shared';
import { useState } from 'react';
import {
  RiArrowRightSLine,
  RiCheckboxCircleFill,
  RiContractUpDownLine,
  RiErrorWarningLine,
  RiExpandUpDownLine,
  RiListCheck3,
  RiRobot2Line,
} from 'react-icons/ri';
import { Link } from 'react-router-dom';
import type { IEnvironmentPublishResponse } from '@/api/environments';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Badge, BadgeIcon } from '../primitives/badge';
import { Button } from '../primitives/button';
import { Collapsible, CollapsibleContent } from '../primitives/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../primitives/dialog';
import { EnvironmentBranchIcon } from '../primitives/environment-branch-icon';
import { InlineToast } from '../primitives/inline-toast';
import { VisuallyHidden } from '../primitives/visually-hidden';

type PublishSuccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
  environment: IEnvironment | null;
  publishResult?: IEnvironmentPublishResponse;
  onSwitchEnvironment?: () => void;
};

export function PublishSuccessModal({
  isOpen,
  onClose,
  environment,
  publishResult,
  onSwitchEnvironment,
}: PublishSuccessModalProps) {
  const { currentEnvironment } = useEnvironment();
  const [needsSetupExpanded, setNeedsSetupExpanded] = useState(true);

  const workflowCount = publishResult?.results?.find((r) => r.resourceType === 'workflow')?.successful?.length ?? 0;
  const layoutCount = publishResult?.results?.find((r) => r.resourceType === 'layout')?.successful?.length ?? 0;
  const translationCount =
    publishResult?.results?.find((r) => r.resourceType === 'translation')?.successful?.length ?? 0;
  const publishedAgents = publishResult?.results?.find((r) => r.resourceType === 'agent')?.successful ?? [];
  // First-time promotions publish as inactive and require production setup
  const newAgents = publishedAgents.filter((a) => a.action === 'created');

  const summaryText = (() => {
    const parts: string[] = [];
    if (workflowCount > 0) parts.push(`${workflowCount} workflow${workflowCount !== 1 ? 's' : ''}`);
    if (layoutCount > 0) parts.push(`${layoutCount} layout${layoutCount !== 1 ? 's' : ''}`);
    if (translationCount > 0) parts.push(`${translationCount} shared component${translationCount !== 1 ? 's' : ''}`);
    if (publishedAgents.length > 0)
      parts.push(`${publishedAgents.length} agent${publishedAgents.length !== 1 ? 's' : ''}`);
    if (parts.length === 0) return 'No items';
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
    return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
  })();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="min-w-[400px] max-w-[600px] gap-4 p-3">
        <VisuallyHidden>
          <DialogTitle>Changes published to {environment?.name}</DialogTitle>
          <DialogDescription>
            {summaryText} have been published to {environment?.name}.
          </DialogDescription>
        </VisuallyHidden>

        <div className="bg-success-lighter w-fit rounded-[10px] p-2">
          <RiCheckboxCircleFill className="text-success-base size-6" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <h2 className="text-label-sm font-medium text-text-strong">Changes published to {environment?.name}</h2>
            {environment && (
              <span className="inline-flex max-w-[150px] shrink-0 items-center gap-1 rounded border border-feature-lighter bg-feature-lighter pl-0.5 pr-1 py-px">
                <EnvironmentBranchIcon environment={environment} size="xs" />
                <span className="text-label-sm truncate font-medium text-feature-base">{environment.name}</span>
              </span>
            )}
          </div>
          <p className="text-paragraph-xs text-text-soft">
            <span className="text-text-sub font-medium">{summaryText}</span> in{' '}
            <span className="text-text-sub font-medium">{currentEnvironment?.name?.toLowerCase()}</span> have been
            Published to {environment?.name}.
          </p>
        </div>

        {newAgents.length > 0 && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-stroke-soft">
              {/* Header */}
              <div className="flex h-7 items-center gap-1 border-b border-stroke-soft bg-bg-weak px-1.5 pt-1 pb-[5px]">
                <RiListCheck3 className="h-4 w-4 shrink-0 text-text-sub" />
                <span className="text-label-xs flex-1 font-medium text-text-sub">Needs setup in production</span>
                <Badge variant="lighter" color="orange" size="sm" square>
                  {newAgents.length}
                </Badge>
                <button
                  onClick={() => setNeedsSetupExpanded(!needsSetupExpanded)}
                  className="flex h-4 w-4 items-center justify-center rounded-lg p-0.5"
                >
                  {needsSetupExpanded ? (
                    <RiContractUpDownLine className="h-3 w-3 text-text-sub" />
                  ) : (
                    <RiExpandUpDownLine className="h-3 w-3 text-text-sub" />
                  )}
                </button>
              </div>

              {/* Rows */}
              <Collapsible open={needsSetupExpanded}>
                <CollapsibleContent>
                  {newAgents.map((agent) => (
                    <Link
                      key={agent.resourceId}
                      to={buildRoute(ROUTES.AGENT_DETAILS, {
                        environmentSlug: environment?.slug ?? '',
                        agentIdentifier: agent.resourceId,
                      })}
                      onClick={onClose}
                      className="flex items-center gap-1.5 border-b border-stroke-soft px-2.5 pt-2 pb-[9px] last:border-b-0 hover:bg-bg-weak transition-colors"
                    >
                      <RiRobot2Line className="h-4 w-4 shrink-0 text-text-sub" />
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span className="text-label-xs truncate font-medium text-text-strong">
                          {agent.resourceName}
                        </span>
                        <span className="truncate font-mono text-[10px] tracking-[-0.2px] text-text-soft">
                          {agent.resourceId}
                        </span>
                      </div>
                      <Badge variant="lighter" color="red" size="sm">
                        <BadgeIcon as={RiErrorWarningLine} />
                        Action needed
                      </Badge>
                      <RiArrowRightSLine className="h-4 w-4 shrink-0 text-text-sub" />
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>

            <InlineToast
              variant="soft-warning"
              description={
                <span>
                  <span className="font-medium text-text-strong">Warning: </span>
                  {newAgents.length} agent{newAgents.length !== 1 ? 's' : ''} have been published in{' '}
                  <span className="font-medium">Inactive</span> state. Setup required instructions by checking the
                  agent.
                </span>
              }
            />
          </div>
        )}

        <div className="flex justify-end">
          <Button
            variant="secondary"
            mode="filled"
            size="2xs"
            onClick={onSwitchEnvironment}
            trailingIcon={RiArrowRightSLine}
          >
            Switch to {environment?.name}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
