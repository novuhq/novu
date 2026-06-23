import { AnimatePresence, motion } from 'motion/react';
import { RiCloseCircleLine } from 'react-icons/ri';
import { Button } from '../primitives/button';
import { EmptyConversationsIlustration } from './empty-conversations-ilustration';

type ConversationsEmptyStateProps = {
  emptySearchResults?: boolean;
  onClearFilters?: () => void;
};

export function ConversationsEmptyState({ emptySearchResults, onClearFilters }: ConversationsEmptyStateProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="empty-state"
        className="flex h-full w-full items-center justify-center border-t border-t-neutral-200"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 5 }}
          transition={{ duration: 0.25, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col items-center gap-6"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.2 }}
            className="flex items-center justify-center"
          >
            <EmptyConversationsIlustration />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.25 }}
            className="flex flex-col items-center gap-2 text-center"
          >
            <h2 className="text-text-soft text-xs font-normal max-w-[400px]">
              {emptySearchResults
                ? 'No conversations match that filter.'
                : 'No conversations, Agent conversations will appear here once the agent starts responding to messages.'}
            </h2>
          </motion.div>

          {emptySearchResults && onClearFilters && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.3 }}
            >
              <Button variant="secondary" mode="outline" className="gap-2" onClick={onClearFilters}>
                <RiCloseCircleLine className="h-4 w-4" />
                Clear Filters
              </Button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
