import { PermissionsEnum } from '@novu/shared';
import { RiMore2Fill, RiRobot2Line } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { CompactButton } from '@/components/primitives/button-compact';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
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

function AgentRowSkeleton() {
  return (
    <TableRow>
      <TableCell colSpan={4} className="animate-pulse">
        <div className="bg-neutral-alpha-100 h-10 w-full rounded-md" />
      </TableCell>
    </TableRow>
  );
}

export function AgentsTable({ agents, isLoading, onRequestDelete, paginationProps }: AgentsTableProps) {
  const has = useHasPermission();
  const canWrite = has?.({ permission: PermissionsEnum.AGENT_WRITE }) ?? true;

  return (
    <Table isLoading={isLoading} loadingRowsCount={paginationProps.pageSize} loadingRow={<AgentRowSkeleton />}>
      <TableHeader>
        <TableRow>
          <TableHead>Agent</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Last updated</TableHead>
          <TableHead className="w-[52px]" />
        </TableRow>
      </TableHeader>
      {!isLoading && (
        <TableBody>
          {agents.map((agent) => {
            return (
              <TableRow key={agent._id}>
                <TableCell>
                  <div className="flex items-start gap-2">
                    <span className="bg-bg-weak text-text-sub flex size-8 shrink-0 items-center justify-center rounded-lg border border-stroke-soft">
                      <RiRobot2Line className="size-4" aria-hidden />
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-text-strong text-label-sm font-medium">{agent.name}</span>
                      <span className="text-text-soft font-mono text-label-xs">{agent.identifier}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={cn('text-label-sm text-text-sub line-clamp-2 max-w-md', !agent.description && 'italic')}
                  >
                    {agent.description?.trim() || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-label-sm text-text-sub">{formatDateSimple(agent.updatedAt)}</span>
                </TableCell>
                <TableCell className="text-right">
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
