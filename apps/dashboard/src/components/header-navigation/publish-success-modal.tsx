import type { IEnvironment } from '@novu/shared';
import { useState } from 'react';
import type { IconType } from 'react-icons';
import {
  RiArrowRightSLine,
  RiCheckboxCircleFill,
  RiCloseFill,
  RiContractUpDownLine,
  RiErrorWarningLine,
  RiExpandUpDownLine,
  RiGitCommitFill,
  RiLayout5Line,
  RiListCheck3,
  RiRobot2Line,
  RiRouteFill,
  RiTranslate2,
} from 'react-icons/ri';
import { Link } from 'react-router-dom';
import type { IEnvironmentPublishResponse } from '@/api/environments';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Badge, BadgeIcon } from '../primitives/badge';
import { Button } from '../primitives/button';
import { Collapsible, CollapsibleContent } from '../primitives/collapsible';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '../primitives/dialog';
import { InlineToast } from '../primitives/inline-toast';
import { ResourceStatusBadge } from './change-badges';

type PublishSuccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
  environment: IEnvironment | null;
  publishResult?: IEnvironmentPublishResponse;
  onSwitchEnvironment?: () => void;
};

type PublishedItem = {
  resourceType: string;
  resourceId: string;
  resourceName: string;
  action: string;
};

const PUBLISHED_TYPE_ORDER = ['workflow', 'layout', 'localization_group', 'translation', 'agent'];

function publishedResourceIcon(resourceType: string): IconType {
  switch (resourceType) {
    case 'workflow':
      return RiRouteFill;
    case 'layout':
      return RiLayout5Line;
    case 'localization_group':
    case 'translation':
      return RiTranslate2;
    case 'agent':
      return RiRobot2Line;
    default:
      return RiRouteFill;
  }
}

function publishedItems(publishResult: IEnvironmentPublishResponse | undefined): PublishedItem[] {
  const items = (publishResult?.results ?? []).flatMap((result) => result.successful ?? []);

  return items.sort((left, right) => {
    const leftOrder = PUBLISHED_TYPE_ORDER.indexOf(left.resourceType);
    const rightOrder = PUBLISHED_TYPE_ORDER.indexOf(right.resourceType);
    const leftRank = leftOrder === -1 ? PUBLISHED_TYPE_ORDER.length : leftOrder;
    const rightRank = rightOrder === -1 ? PUBLISHED_TYPE_ORDER.length : rightOrder;

    return leftRank - rightRank;
  });
}

function liveTitle(count: number, environmentName: string | undefined): string {
  const place = environmentName || 'production';
  if (count === 1) return `1 change is live in ${place}`;

  return `${count} changes are live in ${place}`;
}

function PublishActionBadge({ action }: { action: string }) {
  if (action === 'created') return <ResourceStatusBadge status="added" />;
  if (action === 'deleted') return <ResourceStatusBadge status="deleted" />;

  return (
    <Badge variant="lighter" size="sm" color="orange" className="gap-0.5 pl-1 pr-2">
      <BadgeIcon as={RiGitCommitFill} className="mx-0" />
      Modified
    </Badge>
  );
}

export function PublishSuccessModal({
  isOpen,
  onClose,
  environment,
  publishResult,
  onSwitchEnvironment,
}: PublishSuccessModalProps) {
  const [needsSetupExpanded, setNeedsSetupExpanded] = useState(true);
  const items = publishedItems(publishResult);
  const newAgents = items.filter((item) => item.resourceType === 'agent' && item.action === 'created');
  const title = liveTitle(items.length, environment?.name);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        hideCloseButton
        className="flex max-h-[min(640px,calc(100vh-2rem))] w-[min(440px,calc(100vw-2rem))] max-w-[440px] flex-col gap-4 overflow-hidden border-0 p-4 shadow-[0_16px_32px_-12px_rgba(14,18,27,0.1)] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between">
          <div className="rounded-[10px] bg-success-lighter p-2">
            <RiCheckboxCircleFill className="size-6 text-success-base" />
          </div>
          <DialogClose asChild>
            <button
              type="button"
              className="flex size-4 items-center justify-center text-text-soft transition-colors hover:text-text-strong"
              aria-label="Close"
            >
              <RiCloseFill className="size-4" />
            </button>
          </DialogClose>
        </div>

        <div className="flex flex-col gap-1">
          <DialogTitle className="text-label-md font-medium text-text-strong">{title}</DialogTitle>
          <DialogDescription className="text-[13px] font-normal leading-5 text-text-sub">
            Published by you just now. New triggers use these versions from now on.
          </DialogDescription>
        </div>

        {items.length > 0 && (
          <div className="flex max-h-60 flex-col gap-1 overflow-y-auto rounded-[10px] border border-stroke-weak bg-bg-muted p-1">
            {items.map((item) => {
              const Icon = publishedResourceIcon(item.resourceType);

              return (
                <div
                  key={`${item.resourceType}:${item.resourceId}`}
                  className="flex items-center gap-2 rounded-[7px] bg-bg-white px-2.5 py-2"
                >
                  <Icon className="size-3.5 shrink-0 text-text-sub" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-5 text-text-strong">
                    {item.resourceName}
                  </span>
                  <PublishActionBadge action={item.action} />
                </div>
              );
            })}
          </div>
        )}

        {newAgents.length > 0 && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-stroke-soft">
              <div className="flex h-7 items-center gap-1 border-b border-stroke-soft bg-bg-weak px-1.5 pt-1 pb-[5px]">
                <RiListCheck3 className="h-4 w-4 shrink-0 text-text-sub" />
                <span className="flex-1 text-label-xs font-medium text-text-sub">Needs setup in production</span>
                <Badge variant="lighter" color="orange" size="sm" square>
                  {newAgents.length}
                </Badge>
                <button
                  type="button"
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
                      className="flex items-center gap-1.5 border-b border-stroke-soft px-2.5 pb-[9px] pt-2 transition-colors last:border-b-0 hover:bg-bg-weak"
                    >
                      <RiRobot2Line className="h-4 w-4 shrink-0 text-text-sub" />
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span className="truncate text-label-xs font-medium text-text-strong">
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

        <div className="flex shrink-0 justify-end">
          <Button
            variant="secondary"
            mode="gradient"
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
