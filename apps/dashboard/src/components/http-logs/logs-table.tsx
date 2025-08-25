import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { CursorPagination } from '@/components/cursor-pagination';
import { ResizablePanel, ResizablePanelGroup } from '@/components/primitives/resizable';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { UpdatedAgo } from '@/components/updated-ago';
import { useFetchRequestLogs } from '@/hooks/use-fetch-request-logs';
import { useLogsUrlState } from '@/hooks/use-logs-url-state';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import type { RequestLog } from '../../types/logs';
import { LogsDetailPanel } from './logs-detail-panel';
import { RequestLogsEmptyState } from './logs-empty-state';
import { RequestsFilters } from './logs-filters';
import { LogsTableRow } from './logs-table-row';
import { LogsTableSkeletonRow } from './logs-table-skeleton-row';

type RequestsTableProps = {
  onLogClick?: (log: RequestLog) => void;
};

export function RequestsTable({ onLogClick }: RequestsTableProps) {
  const {
    selectedLogId,
    handleLogSelect,
    handleNext,
    handlePrevious,
    handleFirst,
    handleFiltersChange,
    clearFilters,
    hasActiveFilters,
    currentPage,
    limit,
    filters,
  } = useLogsUrlState();

  const track = useTelemetry();

  const {
    data: logsResponse,
    isLoading,
    refetch,
  } = useFetchRequestLogs({
    page: currentPage - 1,
    limit: limit,
    status: filters.status,
    transactionId: filters.transactionId || undefined,
    urlPattern: filters.urlPattern || undefined,
    createdGte: filters.createdGte ? Number(filters.createdGte) : undefined,
  });

  const logsData = logsResponse?.data || [];
  const totalCount = logsResponse?.total || 0;

  // Track last updated time
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    if (logsResponse) {
      setLastUpdated(new Date());
    }
  }, [logsResponse]);

  const paginationState = useMemo(() => {
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 1;
    const hasNext = totalCount > 0 && currentPage < totalPages;
    const hasPrevious = currentPage > 1;

    return { hasNext, hasPrevious, totalPages };
  }, [totalCount, limit, currentPage]);

  const selectedLog = selectedLogId ? logsData.find((log: RequestLog) => log.id === selectedLogId) : undefined;

  const handleRowClick = (log: RequestLog) => {
    const logId = log.id;
    handleLogSelect(logId);
    onLogClick?.(log);

    track(TelemetryEvent.REQUEST_LOG_ENTRY_CLICKED, {
      urlPattern: log.urlPattern,
      method: log.method,
    });
  };

  const handleRefresh = async () => {
    await refetch();
    setLastUpdated(new Date());
  };

  if (!isLoading && logsData.length === 0 && !hasActiveFilters) {
    return <RequestLogsEmptyState />;
  }

  return (
    <div className="flex h-full flex-col p-2.5">
      <div className="flex items-center justify-between">
        <RequestsFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
        <UpdatedAgo lastUpdated={lastUpdated} onRefresh={handleRefresh} />
      </div>

      <div className="relative flex h-full min-h-full flex-1 pt-2.5">
        <ResizablePanelGroup direction="horizontal" className="gap-2">
          <ResizablePanel defaultSize={50} minSize={50}>
            <div className="flex h-full flex-col">
              <div className="flex-1">
                <Table isLoading={isLoading} loadingRow={<LogsTableSkeletonRow />} loadingRowsCount={8}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-text-strong h-8 px-2 py-0">Requests</TableHead>
                      <TableHead className="h-8 w-[200px] px-2 py-0"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData.map((log: RequestLog) => {
                      const logId = log.id;
                      return (
                        <LogsTableRow
                          key={logId}
                          log={log}
                          onClick={handleRowClick}
                          isSelected={selectedLogId === logId}
                        />
                      );
                    })}
                  </TableBody>
                </Table>
                {(paginationState.hasNext || paginationState.hasPrevious) && (
                  <CursorPagination
                    hasNext={paginationState.hasNext}
                    hasPrevious={paginationState.hasPrevious}
                    onNext={handleNext}
                    onPrevious={handlePrevious}
                    onFirst={handleFirst}
                  />
                )}
              </div>

              {!isLoading && logsData.length === 0 && hasActiveFilters && (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-center">
                    <p className="text-foreground-600 mb-2">No requests found matching your filters</p>
                    <button
                      onClick={clearFilters}
                      className="text-foreground-950 hover:text-foreground-600 text-sm font-medium underline"
                    >
                      Clear filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizablePanel defaultSize={50} minSize={35} maxSize={50}>
            <motion.div
              key={selectedLogId || 'empty'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="border-stroke-soft h-full overflow-auto rounded-lg border bg-white"
            >
              <LogsDetailPanel log={selectedLog} />
            </motion.div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
