import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { createSearchParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ConversationFilters } from '@/api/conversations';
import { Skeleton } from '@/components/primitives/skeleton';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
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
import { useFetchConversations } from '@/hooks/use-fetch-conversations';
import { usePersistedPageSize } from '@/hooks/use-persisted-page-size';
import { ConversationTableRow } from './conversation-table-row';
import { ConversationsEmptyState } from './conversations-empty-state';

const CONVERSATIONS_TABLE_ID = 'conversations-table';

export type ConversationsTableProps = {
  selectedConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
  filters?: ConversationFilters;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onListStateChange?: (hasConversations: boolean) => void;
};

export function ConversationsTable({
  selectedConversationId,
  onConversationSelect,
  filters,
  hasActiveFilters,
  onClearFilters,
  onListStateChange,
}: ConversationsTableProps) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { pageSize, setPageSize } = usePersistedPageSize({
    tableId: CONVERSATIONS_TABLE_ID,
    defaultPageSize: 10,
  });

  const beforeCursor = searchParams.get('before') ?? undefined;
  const afterCursor = beforeCursor ? undefined : (searchParams.get('after') ?? undefined);

  const { conversations, next, previous, totalCount, totalCountCapped, isLoading, error } = useFetchConversations(
    {
      filters,
      after: afterCursor,
      before: beforeCursor,
      limit: pageSize,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (error) {
      showErrorToast(
        error instanceof Error ? error.message : 'There was an error loading the conversations.',
        'Failed to fetch conversations'
      );
    }
  }, [error]);

  useEffect(() => {
    onListStateChange?.(!isLoading && conversations.length > 0);
  }, [isLoading, conversations.length, onListStateChange]);

  function handleNextPage() {
    if (!next) {
      return;
    }

    const newParams = createSearchParams(Object.fromEntries(searchParams));
    newParams.delete('page');
    newParams.delete('before');
    newParams.set('after', next);
    navigate(`${location.pathname}?${newParams}`);
  }

  function handlePreviousPage() {
    if (!previous) {
      return;
    }

    const newParams = createSearchParams(Object.fromEntries(searchParams));
    newParams.delete('page');
    newParams.delete('after');
    newParams.set('before', previous);
    navigate(`${location.pathname}?${newParams}`);
  }

  function handlePageSizeChange(newPageSize: number) {
    setPageSize(newPageSize);
    const newParams = createSearchParams(Object.fromEntries(searchParams));
    newParams.delete('page');
    newParams.delete('after');
    newParams.delete('before');
    navigate(`${location.pathname}?${newParams}`);
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!isLoading && conversations.length === 0 ? (
        <motion.div
          key="empty-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-full w-full items-center justify-center"
        >
          <ConversationsEmptyState emptySearchResults={hasActiveFilters} onClearFilters={onClearFilters} />
        </motion.div>
      ) : (
        <motion.div
          key="table-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-full flex-1 flex-col"
        >
          <Table
            isLoading={isLoading}
            loadingRow={<SkeletonRow />}
            containerClassname="bg-transparent w-full flex flex-col overflow-y-auto overflow-x-hidden max-h-full rounded-lg border border-neutral-200 bg-white"
          >
            <TableHeader>
              <TableRow className="bg-bg-weak [&>th]:bg-bg-weak [&>th:last-child]:relative [&>th:last-child]:after:absolute [&>th:last-child]:after:left-full [&>th:last-child]:after:top-0 [&>th:last-child]:after:bottom-0 [&>th:last-child]:after:w-screen [&>th:last-child]:after:bg-bg-weak [&>th:last-child]:after:content-[''] [&>th:last-child]:after:-z-10">
                <TableHead colSpan={2} className="text-text-strong h-8 px-3 py-0">
                  Activity
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversations.map((conversation) => (
                <ConversationTableRow
                  key={conversation._id}
                  conversation={conversation}
                  isSelected={selectedConversationId === conversation.identifier}
                  onClick={onConversationSelect}
                />
              ))}
            </TableBody>
            <TableFooter className="border-t border-t-neutral-200">
              <TableRow>
                <TableCell colSpan={2} className="p-0">
                  <TablePaginationFooter
                    pageSize={pageSize}
                    currentPageItemsCount={conversations.length}
                    onPreviousPage={handlePreviousPage}
                    onNextPage={handleNextPage}
                    onPageSizeChange={handlePageSizeChange}
                    hasPreviousPage={!!previous}
                    hasNextPage={!!next}
                    className="bg-transparent shadow-none"
                    totalCount={totalCount}
                    totalCountCapped={totalCountCapped}
                    pageSizeOptions={[10, 20, 50]}
                  />
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell colSpan={2} className="px-3 py-1.5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Skeleton className="size-4 rounded-full" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-3.5 w-32" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Skeleton className="size-4" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
