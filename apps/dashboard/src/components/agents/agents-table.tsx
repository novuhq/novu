import { AgentRuntimeProviderIdEnum, providers as novuProviders, PermissionsEnum } from '@novu/shared';
import { ComponentProps } from 'react';
import {
  RiChat3Line,
  RiCheckboxCircleFill,
  RiDeleteBinLine,
  RiForbidFill,
  RiMore2Fill,
  RiPauseCircleLine,
  RiPlayCircleLine,
  RiRobot2Line,
} from 'react-icons/ri';
import { SiAmazonwebservices, SiAnthropic } from 'react-icons/si';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { AgentResponse } from '@/api/agents';
import { ExceedsPlanIndicator } from '@/components/agents/exceeds-plan-indicator';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { CompactButton } from '@/components/primitives/button-compact';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { Skeleton } from '@/components/primitives/skeleton';
import { StatusBadge, StatusBadgeIcon } from '@/components/primitives/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/primitives/table';
import { TablePaginationFooter } from '@/components/primitives/table-pagination-footer';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useEnvironment } from '@/context/environment/hooks';
import { useAgentRoutes } from '@/hooks/use-agent-routes';
import { useHasPermission } from '@/hooks/use-has-permission';
import { formatDateSimple } from '@/utils/format-date';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { AwsIcon } from '../icons/aws';
import { ClaudeIcon } from '../icons/claude';

type AgentsTableProps = {
  agents: AgentResponse[];
  isLoading: boolean;
  onRequestDelete: (agent: AgentResponse) => void;
  onToggleActive: (agent: AgentResponse) => void;
  togglingAgentId?: string | null;
  paginationProps: {
    pageSize: number;
    pageSizeOptions?: number[];
    currentItemsCount: number;
    onPreviousPage: () => void;
    onNextPage: () => void;
    onPageSizeChange: (pageSize: number) => void;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    totalCount?: number;
    totalCountCapped?: boolean;
  };
};

type AgentNavTableCellProps = ComponentProps<typeof TableCell> & {
  to?: string;
};

function AgentNavTableCell({ children, className, to, ...rest }: AgentNavTableCellProps) {
  return (
    <TableCell className={cn('group-hover:bg-neutral-alpha-50 text-text-sub relative', className)} {...rest}>
      {to ? (
        <Link to={to} className="absolute inset-0" tabIndex={-1}>
          <span className="sr-only">View agent details</span>
        </Link>
      ) : null}
      {children}
    </TableCell>
  );
}

const MAX_VISIBLE_INTEGRATION_ICONS = 3;

function getProviderDisplayName(providerId: string): string {
  return novuProviders.find((p) => p.id === providerId)?.displayName ?? providerId;
}

// Renders an icon reflecting the agent's runtime: the managed provider's brand
// (Claude/Anthropic, AWS) when managed, or a generic robot for custom self-hosted code.
function AgentIcon({ agent }: { agent: AgentResponse }) {
  const managedProviderId = agent.runtime === 'managed' ? agent.managedRuntime?.providerId : undefined;

  let icon = <RiRobot2Line className="size-3.5" aria-hidden />;

  if (managedProviderId === AgentRuntimeProviderIdEnum.AnthropicAws) {
    icon = <AwsIcon className="size-3.5" aria-hidden />;
  } else if (
    managedProviderId === AgentRuntimeProviderIdEnum.Anthropic ||
    managedProviderId === AgentRuntimeProviderIdEnum.NovuAnthropic
  ) {
    icon = <ClaudeIcon className="size-3.5" aria-hidden />;
  }

  return (
    <span className="text-text-sub flex size-5 shrink-0 items-center justify-center" aria-hidden>
      {icon}
    </span>
  );
}

function AgentIntegrationsCell({ agent }: { agent: AgentResponse }) {
  const integrations = agent.integrations ?? [];

  if (integrations.length === 0) {
    return <span className="text-label-sm text-text-sub italic">—</span>;
  }

  const visible = integrations.slice(0, MAX_VISIBLE_INTEGRATION_ICONS);
  const overflowCount = integrations.length - visible.length;

  return (
    <div className="relative z-10 flex min-h-[41px] items-center">
      <div className="flex items-center">
        {visible.map((integration, index) => {
          return (
            <Tooltip key={integration.integrationId}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={integration.name}
                  className={cn(
                    'border-static-white bg-bg-white shadow-xs relative box-border flex size-6 shrink-0 cursor-default items-center justify-center rounded-full border border-solid p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stroke-sub',
                    index > 0 && '-ml-2'
                  )}
                  style={{ zIndex: 10 + index }}
                >
                  <ProviderIcon
                    providerId={integration.providerId}
                    providerDisplayName={getProviderDisplayName(integration.providerId)}
                    className={cn(
                      'pointer-events-none block h-4 w-4 max-h-4 max-w-4 shrink-0',
                      !integration.active && 'opacity-60 grayscale'
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">{integration.name}</TooltipContent>
            </Tooltip>
          );
        })}
        {overflowCount > 0 ? (
          <span className="text-text-soft text-label-xs ml-1.5 shrink-0 tabular-nums">+{overflowCount}</span>
        ) : null}
      </div>
    </div>
  );
}

function AgentStatusCell({ agent }: { agent: AgentResponse }) {
  if (agent.exceedsPlanLimit) {
    return <ExceedsPlanIndicator resource="agent" className="relative z-10" />;
  }

  if (agent.active) {
    return (
      <StatusBadge variant="light" status="completed">
        <StatusBadgeIcon as={RiCheckboxCircleFill} />
        Active
      </StatusBadge>
    );
  }

  return (
    <StatusBadge variant="light" status="disabled">
      <StatusBadgeIcon as={RiForbidFill} />
      Inactive
    </StatusBadge>
  );
}

function AgentsTableSkeletonRow() {
  return (
    <TableRow>
      <TableCell className="p-3">
        <div className="flex min-h-[41px] items-center gap-4">
          <Skeleton className="size-5 shrink-0 rounded-md" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Skeleton className="h-5 w-[min(100%,20ch)]" />
            <Skeleton className="h-3 w-[min(100%,15ch)] rounded-full" />
          </div>
        </div>
      </TableCell>
      <TableCell className="p-3">
        <Skeleton className="h-6 w-[9ch] rounded-md" />
      </TableCell>
      <TableCell className="p-3">
        <div className="flex min-h-[41px] items-center">
          <div className="flex items-center">
            <Skeleton className="border-static-white bg-bg-white size-6 shrink-0 rounded-full border border-solid shadow-xs" />
            <Skeleton className="border-static-white bg-bg-white size-6 shrink-0 -ml-2 rounded-full border border-solid shadow-xs" />
            <Skeleton className="border-static-white bg-bg-white size-6 shrink-0 -ml-2 rounded-full border border-solid shadow-xs" />
          </div>
        </div>
      </TableCell>
      <TableCell className="p-3">
        <Skeleton className="h-5 w-[9ch] rounded-full" />
      </TableCell>
      <TableCell className="w-[52px] p-3 text-right">
        <RiMore2Fill className="text-foreground-600 size-4 opacity-50" aria-hidden />
      </TableCell>
    </TableRow>
  );
}

export function AgentsTable({
  agents,
  isLoading,
  onRequestDelete,
  onToggleActive,
  togglingAgentId,
  paginationProps,
}: AgentsTableProps) {
  const has = useHasPermission();
  const canWrite = has({ permission: PermissionsEnum.AGENT_WRITE });
  const { currentEnvironment, readOnly } = useEnvironment();
  const location = useLocation();
  const navigate = useNavigate();
  const agentRoutes = useAgentRoutes();

  return (
    <Table isLoading={isLoading} loadingRowsCount={5} loadingRow={<AgentsTableSkeletonRow />}>
      <TableHeader>
        <TableRow>
          <TableHead className="h-11 px-3 py-2.5">Agents</TableHead>
          <TableHead className="h-11 px-3 py-2.5">Status</TableHead>
          <TableHead className="h-11 px-3 py-2.5">Integrations</TableHead>
          <TableHead className="h-11 px-3 py-2.5">Last updated</TableHead>
          <TableHead className="h-11 w-[52px] px-3 py-2.5">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      {!isLoading && (
        <TableBody>
          {agents.map((agent) => {
            const agentDetailsPath = `${buildRoute(agentRoutes.detailsTab, {
              environmentSlug: currentEnvironment?.slug ?? '',
              agentIdentifier: encodeURIComponent(agent.identifier),
              agentTab: 'overview',
            })}${location.search}`;

            const conversationsPath = `${buildRoute(ROUTES.ACTIVITY_CONVERSATIONS, {
              environmentSlug: currentEnvironment?.slug ?? '',
            })}?agentId=${encodeURIComponent(agent.identifier)}`;

            const isToggling = togglingAgentId === agent.identifier;

            return (
              <TableRow key={agent._id} className="group relative isolate cursor-pointer">
                <AgentNavTableCell to={agentDetailsPath} className="p-3 align-middle">
                  <div className="flex min-h-[41px] items-center gap-4">
                    <AgentIcon agent={agent} />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-text-strong text-label-sm font-medium leading-5 tracking-tight">
                        {agent.name}
                      </span>
                      <span className="text-text-soft font-mono text-label-xs leading-4 tracking-tight">
                        {agent.identifier}
                      </span>
                    </div>
                  </div>
                </AgentNavTableCell>
                <AgentNavTableCell to={agentDetailsPath} className="p-3 align-middle">
                  <AgentStatusCell agent={agent} />
                </AgentNavTableCell>
                <AgentNavTableCell to={agentDetailsPath} className="p-3 align-middle">
                  <AgentIntegrationsCell agent={agent} />
                </AgentNavTableCell>
                <AgentNavTableCell
                  to={agentDetailsPath}
                  className="text-foreground-600 p-3 align-middle text-sm font-medium"
                >
                  <span className="text-label-sm">{formatDateSimple(agent.updatedAt)}</span>
                </AgentNavTableCell>
                <AgentNavTableCell className="w-1 p-3 text-right align-middle">
                  {canWrite ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <CompactButton
                          variant="ghost"
                          icon={RiMore2Fill}
                          className="z-10 h-8 w-8 p-0"
                          disabled={readOnly}
                        >
                          <span className="sr-only">Open menu</span>
                        </CompactButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => {
                            navigate(conversationsPath);
                          }}
                        >
                          <RiChat3Line className="text-text-sub size-4" />
                          View conversations
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          disabled={isToggling}
                          onClick={() => {
                            onToggleActive(agent);
                          }}
                        >
                          {agent.active ? (
                            <RiPauseCircleLine className="text-text-sub size-4" />
                          ) : (
                            <RiPlayCircleLine className="text-text-sub size-4" />
                          )}
                          {agent.active ? 'Pause agent' : 'Activate agent'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive cursor-pointer"
                          onClick={() => {
                            setTimeout(() => onRequestDelete(agent), 0);
                          }}
                        >
                          <RiDeleteBinLine className="size-4" />
                          Delete agent
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </AgentNavTableCell>
              </TableRow>
            );
          })}
        </TableBody>
      )}
      {!isLoading && agents.length > 0 ? (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5} className="p-0">
              <TablePaginationFooter
                pageSize={paginationProps.pageSize}
                currentPageItemsCount={paginationProps.currentItemsCount}
                onPreviousPage={paginationProps.onPreviousPage}
                onNextPage={paginationProps.onNextPage}
                onPageSizeChange={paginationProps.onPageSizeChange}
                hasPreviousPage={paginationProps.hasPreviousPage}
                hasNextPage={paginationProps.hasNextPage}
                itemName="agents"
                totalCount={paginationProps.totalCount}
                totalCountCapped={paginationProps.totalCountCapped}
                pageSizeOptions={paginationProps.pageSizeOptions}
              />
            </TableCell>
          </TableRow>
        </TableFooter>
      ) : null}
    </Table>
  );
}
