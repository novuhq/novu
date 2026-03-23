import { AnimatePresence, motion } from 'motion/react';
import { RiCheckLine, RiCloseLine } from 'react-icons/ri';
import { RefreshIcon } from '../icons/refresh';
import { Button } from '../primitives/button';

type ChatMessageActionsProps = {
  lastUserMessageId: string;
  isActionPending?: boolean;
  onKeepAll: () => void;
  onDiscard: (messageId: string) => void;
  onTryAgain: (messageId: string) => void;
};

export function ChatMessageActions({
  lastUserMessageId,
  isActionPending,
  onKeepAll,
  onDiscard,
  onTryAgain,
}: ChatMessageActionsProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-start gap-1.5 py-1.5"
      >
        <span className="text-label-xs text-[#99A0AE]">Suggestions are ready. You can discard them if needed.</span>
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            mode="ghost"
            size="2xs"
            className="px-0 hover:bg-transparent [&:disabled:not(.loading)]:bg-transparent"
            onClick={onKeepAll}
            disabled={isActionPending}
            trailingIcon={RiCheckLine}
          >
            Keep all
          </Button>
          <span className="text-[#99A0AE]">·</span>
          <Button
            variant="secondary"
            mode="ghost"
            size="2xs"
            className="px-0 hover:bg-transparent [&:disabled:not(.loading)]:bg-transparent"
            onClick={() => onDiscard(lastUserMessageId)}
            disabled={isActionPending}
            trailingIcon={RiCloseLine}
          >
            Discard
          </Button>
          <span className="text-[#99A0AE]">·</span>
          <Button
            variant="secondary"
            mode="ghost"
            size="2xs"
            className="px-0 hover:bg-transparent [&:disabled:not(.loading)]:bg-transparent [&>svg]:size-3"
            onClick={() => onTryAgain(lastUserMessageId)}
            disabled={isActionPending}
            trailingIcon={RefreshIcon}
          >
            Try again
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
