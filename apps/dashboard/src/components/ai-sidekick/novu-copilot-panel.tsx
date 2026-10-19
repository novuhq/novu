import { AnimatePresence, motion } from 'motion/react';
import { BroomSparkle } from '../icons/broom-sparkle';
import { Badge } from '../primitives/badge';
import { useAiChat } from './ai-chat-context';
import { ChatBody, ChatBodySkeleton } from './chat-body';

const FADE_TRANSITION = { duration: 0.4, ease: 'easeInOut' } as const;

export function NovuCopilotPanel({ hideHeader }: { hideHeader?: boolean }) {
  const {
    hasNoChatHistory,
    messages,
    status,
    error,
    handleStop,
    isGenerating,
    isLoading,
    isCreatingChat,
    isActionPending,
    isReviewingChanges,
    inputText,
    lastUserMessageId,
    newChatSuggestions,
    setInputText,
    handleSendMessage,
    handleKeepAll,
    handleTryAgain,
    handleRevertMessage,
    handleDiscard,
    handleSuggestionClick,
  } = useAiChat();

  return (
    <motion.div
      className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={FADE_TRANSITION}
    >
      {!hideHeader && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b px-3 py-2">
          <div className="flex items-center gap-0.5 rounded px-0.5 py-1">
            <div className="flex size-5 items-center justify-center">
              <BroomSparkle className="size-3" isAnimating={isGenerating} />
            </div>
            <span
              className="text-label-sm font-medium"
              style={{
                background: 'linear-gradient(90deg, #939292 0%, #646464 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Novu Copilot
            </span>
            <Badge variant="lighter" color="gray" className="ml-1">
              BETA
            </Badge>
          </div>
        </div>
      )}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE_TRANSITION}
          >
            <ChatBodySkeleton />
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE_TRANSITION}
          >
            <ChatBody
              hasNoChatHistory={hasNoChatHistory}
              inputText={inputText}
              onInputChange={setInputText}
              isGenerating={isGenerating}
              status={status}
              errorMessage={error?.message}
              stop={handleStop}
              onSubmit={handleSendMessage}
              messages={messages}
              isSubmitDisabled={isCreatingChat}
              isReviewingChanges={isReviewingChanges}
              isActionPending={isActionPending}
              onKeepAll={handleKeepAll}
              onDiscard={handleDiscard}
              onTryAgain={handleTryAgain}
              onRevertMessage={handleRevertMessage}
              onSuggestionClick={handleSuggestionClick}
              lastUserMessageId={lastUserMessageId}
              newChatSuggestions={newChatSuggestions}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
