/** biome-ignore-all lint/correctness/useUniqueElementIds: expected */
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useMemo, useState } from 'react';
import { conversationQueryKeys } from '@/components/conversations/conversation-query-keys';
import { ConversationFilters } from '@/components/conversations/conversations-filters';
import { ConversationsTable } from '@/components/conversations/conversations-table';
import { ConversationsUpgradeCta } from '@/components/conversations/conversations-upgrade-cta';
import { ResizablePanel, ResizablePanelGroup } from '@/components/primitives/resizable';
import { UpdatedAgo } from '@/components/updated-ago';
import { IS_SELF_HOSTED } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useConversationUrlState } from '@/hooks/use-conversation-url-state';
import { cn } from '@/utils/ui';
import { EmptyTopicsIllustration } from '../topics/empty-topics-illustration';
import { defaultConversationFilters } from './constants';
import { ConversationDetail } from './conversation-detail';

type ConversationsContentProps = {
  className?: string;
  contentHeight?: string;
};

export function ConversationsContent({
  className,
  contentHeight = 'h-[calc(100vh-140px)]',
}: ConversationsContentProps) {
  if (IS_SELF_HOSTED) {
    return (
      <div className={cn('p-2.5', className)}>
        <div className={cn('flex', contentHeight)}>
          <div className="border-stroke-soft flex flex-1 items-center justify-center rounded-lg border bg-white">
            <ConversationsUpgradeCta source="activity-feed-conversations" />
          </div>
        </div>
      </div>
    );
  }

  return <EnterpriseConversationsContent className={className} contentHeight={contentHeight} />;
}

function EnterpriseConversationsContent({
  className,
  contentHeight = 'h-[calc(100vh-140px)]',
}: ConversationsContentProps) {
  const { conversationItemId, filters, filterValues, handleConversationSelect, handleFiltersChange } =
    useConversationUrlState();
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const onListStateChange = useCallback((hasConversations: boolean) => setShowDetailPanel(hasConversations), []);

  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const [lastUpdated, setLastUpdated] = useState(new Date());

  const mergedFilterValues = useMemo(
    () => ({
      ...defaultConversationFilters,
      ...filterValues,
    }),
    [filterValues]
  );

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'dateRange') return false;
    if (Array.isArray(value)) return value.length > 0;

    return !!value;
  });

  const handleClearFilters = () => {
    handleFiltersChange({ ...defaultConversationFilters });
  };

  const hasChanges = useMemo(() => {
    return (
      mergedFilterValues.dateRange !== defaultConversationFilters.dateRange ||
      mergedFilterValues.subscriberId !== '' ||
      mergedFilterValues.provider.length > 0 ||
      mergedFilterValues.conversationId !== ''
    );
  }, [mergedFilterValues]);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: [conversationQueryKeys.fetchConversations, currentEnvironment?._id],
    });
    setLastUpdated(new Date());
  };

  return (
    <div className={cn('p-2.5', className)}>
      <div className="flex items-center justify-between gap-2 pb-2.5">
        <ConversationFilters
          filters={mergedFilterValues}
          onFiltersChange={handleFiltersChange}
          onReset={handleClearFilters}
          showReset={hasChanges}
          className="pb-0"
        />
        <UpdatedAgo lastUpdated={lastUpdated} onRefresh={handleRefresh} />
      </div>
      <div className={`relative flex ${contentHeight}`}>
        <ResizablePanelGroup orientation="horizontal" className="gap-2" autoSaveId="conversations-panel-group">
          <ResizablePanel
            defaultSize="50%"
            minSize="35%"
            className="h-full transition-[flex-basis] duration-300 ease-out"
            id="conversations-table-panel"
          >
            <ConversationsTable
              selectedConversationId={conversationItemId}
              onConversationSelect={handleConversationSelect}
              filters={filters}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={handleClearFilters}
              onListStateChange={onListStateChange}
            />
          </ResizablePanel>

          {showDetailPanel && (
            <ResizablePanel
              defaultSize="50%"
              minSize="35%"
              maxSize="50%"
              className="overflow-hidden"
              id="conversations-detail-panel"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={conversationItemId}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  className="border-stroke-soft h-full overflow-auto rounded-lg border bg-white"
                >
                  {conversationItemId ? (
                    <ConversationDetail
                      conversationId={conversationItemId}
                      onClose={() => handleConversationSelect('')}
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-6 text-center">
                      <EmptyTopicsIllustration />
                      <p className="text-text-soft text-paragraph-sm max-w-[60ch]">
                        Nothing to show,
                        <br />
                        Select a conversation on the left to view details here
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
