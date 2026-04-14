import { providers as novuProviders, PermissionsEnum } from '@novu/shared';
import { RiMore2Fill, RiRobot2Line } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { CompactButton } from '@/components/primitives/button-compact';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { Skeleton } from '@/components/primitives/skeleton';
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
import { useHasPermission } from '@/hooks/use-has-permission';
import { formatDateSimple } from '@/utils/format-date';
import { cn } from '@/utils/ui';

type AgentsTableProps = {
  agents: AgentResponse[];
  isLoading: boolean;
  onRequestDelete: (agent: AgentResponse) => void;
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

const MAX_VISIBLE_INTEGRATION_ICONS = 3;

function getProviderDisplayName(providerId: string): string {
  return novuProviders.find((p) => p.id === providerId)?.displayName ?? providerId;
}

function AgentIntegrationsCell({ agent }: { agent: AgentResponse }) {
  const integrations = agent.integrations ?? [];

  if (integrations.length === 0) {
    return <span className="text-label-sm text-text-sub italic">—</span>;
  }

  const visible = integrations.slice(0, MAX_VISIBLE_INTEGRATION_ICONS);
  const overflowCount = integrations.length - visible.length;

  return (
    <div className="flex min-h-[41px] items-center">
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

export function AgentsTable({ agents, isLoading, onRequestDelete, paginationProps }: AgentsTableProps) {
  const has = useHasPermission();
  const canWrite = has?.({ permission: PermissionsEnum.AGENT_WRITE }) ?? true;

  return (
    <Table isLoading={isLoading} loadingRowsCount={5} loadingRow={<AgentsTableSkeletonRow />}>
      <TableHeader>
        <TableRow>
          <TableHead className="h-11 px-3 py-2.5">Agent</TableHead>
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
            return (
              <TableRow key={agent._id}>
                <TableCell className="p-3 align-middle">
                  <div className="flex min-h-[41px] items-center gap-4">
                    <span className="text-text-sub flex size-5 shrink-0 items-center justify-center" aria-hidden>
                      <RiRobot2Line className="size-3.5" />
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-text-strong text-label-sm font-medium leading-5 tracking-tight">
                        {agent.name}
                      </span>
                      <span className="text-text-soft font-mono text-label-xs leading-4 tracking-tight">
                        {agent.identifier}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="p-3 align-middle">
                  <AgentIntegrationsCell agent={agent} />
                </TableCell>
                <TableCell className="text-foreground-600 p-3 align-middle text-sm font-medium">
                  <span className="text-label-sm">{formatDateSimple(agent.updatedAt)}</span>
                </TableCell>
                <TableCell className="p-3 text-right align-middle">
                  {canWrite ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <CompactButton size="md" variant="ghost" icon={RiMore2Fill}>
                          <span className="sr-only">Open menu</span>
                        </CompactButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive cursor-pointer"
                          onClick={() => onRequestDelete(agent)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      )}
      {!isLoading && agents.length > 0 ? (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="p-0">
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
