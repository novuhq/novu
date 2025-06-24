import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { ResizablePanel, ResizablePanelGroup } from '@/components/primitives/resizable';
import { RequestLog } from '../../types/logs';
import { LogsTableRow } from './logs-table-row';
import { LogsDetailPanel } from './logs-detail-panel';
import { useLogsUrlState } from '@/hooks/use-logs-url-state';
import { useFetchRequestLogs } from '@/hooks/use-fetch-request-logs';
import { RiArrowLeftSLine, RiArrowRightSLine, RiSkipBackLine, RiSkipForwardLine } from 'react-icons/ri';

type LogsTableProps = {
  onLogClick?: (log: RequestLog) => void;
};

export function LogsTable({ onLogClick }: LogsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const { selectedLogId, handleLogSelect } = useLogsUrlState();
  const itemsPerPage = 20;

  const { data: logsResponse, isLoading } = useFetchRequestLogs({
    page: currentPage - 1, // API is 0-based
    limit: itemsPerPage,
  });

  const logsData = logsResponse?.data || [];
  const totalCount = logsResponse?.total || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  const selectedLog = selectedLogId
    ? logsData.find((log: RequestLog) => (log.transactionId || `error-${logsData.indexOf(log)}`) === selectedLogId)
    : undefined;

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handleFirstPage = () => {
    setCurrentPage(1);
  };

  const handleLastPage = () => {
    setCurrentPage(totalPages);
  };

  const handleRowClick = (log: RequestLog) => {
    const logId = log.transactionId || `error-${logsData.indexOf(log)}`;
    handleLogSelect(logId);
    onLogClick?.(log);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex flex-1">
        <ResizablePanelGroup direction="horizontal" className="gap-2">
          <ResizablePanel defaultSize={50} minSize={50}>
            <div className="flex h-full flex-col">
              <div className="flex-1">
                <Table isLoading={isLoading}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-text-strong h-8 px-2 py-0">Logs</TableHead>
                      <TableHead className="h-8 w-[175px] px-2 py-0"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData.map((log: RequestLog, index: number) => {
                      const logId = log.transactionId || `error-${index}`;
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
              </div>

              <div className="flex items-center justify-between border-t border-neutral-200 bg-white px-6 py-4">
                <div className="text-foreground-600 text-sm">{totalCount.toLocaleString()} results</div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFirstPage}
                    disabled={currentPage === 1}
                    className="rounded-md p-2 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RiSkipBackLine className="size-4" />
                  </button>

                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="rounded-md p-2 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RiArrowLeftSLine className="size-4" />
                  </button>

                  <span className="px-3 py-1 text-sm">
                    {startItem}-{endItem} of {totalCount.toLocaleString()}
                  </span>

                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="rounded-md p-2 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RiArrowRightSLine className="size-4" />
                  </button>

                  <button
                    onClick={handleLastPage}
                    disabled={currentPage === totalPages}
                    className="rounded-md p-2 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RiSkipForwardLine className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <AnimatePresence mode="wait">
            {selectedLogId && (
              <>
                <ResizablePanel defaultSize={50} minSize={35} maxSize={50}>
                  <motion.div
                    key={selectedLogId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="bg-background h-full overflow-auto"
                  >
                    <LogsDetailPanel log={selectedLog} />
                  </motion.div>
                </ResizablePanel>
              </>
            )}
          </AnimatePresence>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
