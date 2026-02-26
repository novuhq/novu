import { BroomSparkle } from '../icons/broom-sparkle';
import { useAiChat } from './ai-chat-context';
import { ChatBody, ChatBodySkeleton } from './chat-body';

export function AiSidekickPanel() {
  const {
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
    setInputText,
    handleSendMessage,
    handleKeepAll,
    handleTryAgain,
    handleRevertMessage,
    handleDiscard,
  } = useAiChat();

  return (
    <div className="flex h-full min-w-[360px] w-[360px] flex-col overflow-hidden border-r bg-white">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-3 py-2">
        <div className="flex items-center gap-0.5 rounded px-0.5 py-1">
          <div className="flex size-5 items-center justify-center">
            <BroomSparkle className="size-3" />
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
            Novu Sidekick
          </span>
        </div>
      </div>
      {isLoading ? (
        <ChatBodySkeleton />
      ) : (
        <ChatBody
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
          lastUserMessageId={lastUserMessageId}
        />
      )}
    </div>
  );
}
