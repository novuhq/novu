import { AiAgentTypeEnum, AiResourceTypeEnum } from '@novu/shared';
import { generateId, UIMessage, UITools } from 'ai';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';
import { useAiChatStream } from '@/hooks/use-ai-chat-stream';
import { useCreateAiChat } from '@/hooks/use-create-ai-chat';
import { useFetchLatestAiChat } from '@/hooks/use-fetch-latest-ai-chat';
import { BroomSparkle } from '../icons/broom-sparkle';
import { useWorkflow } from '../workflow-editor/workflow-provider';
import { ChatBody, ChatBodySkeleton } from './chat-body';

export function AiSidekickPanel() {
  const [inputText, setInputText] = useState('');
  const isMountedRef = useRef(false);
  const location = useLocation();
  const { workflow, isPending: isFetchingWorkflow } = useWorkflow();
  const { areEnvironmentsInitialLoading } = useEnvironment();
  const { refetch } = useWorkflow();

  const chatId = useMemo(() => {
    if (location.state && 'chatId' in location.state) {
      return location.state.chatId as string;
    }

    return generateId();
  }, [location]);

  const { setMessages, sendPrompt, stop, status, isGenerating, messages, dataParts, resume } = useAiChatStream<{
    reasoning: { toolCallId: string; text: string };
  }>({
    id: chatId,
    agentType: AiAgentTypeEnum.ADD_WORKFLOW_STEPS,
    onData: async (data) => {
      const dataType = (data as { type: string }).type;
      if (isMountedRef.current && (dataType === 'data-step-added' || dataType === 'data-workflow-completed')) {
        refetch({ cancelRefetch: true });
      }
    },
  });

  const { latestChat, isPending: isFetchingAiChat } = useFetchLatestAiChat({
    resourceType: AiResourceTypeEnum.WORKFLOW,
    resourceId: workflow?._id,
  });

  const { createAiChat, isPending: isCreatingAiChat } = useCreateAiChat();

  useEffect(() => {
    if (latestChat) {
      setMessages(
        latestChat.messages as UIMessage<unknown, { reasoning: { toolCallId: string; text: string } }, UITools>[]
      );
      resume();
    }
  }, [latestChat, setMessages, resume]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stop();
    };
  }, [stop]);

  const handleSendMessage = async (message: string) => {
    const messageToSend = message.trim();
    if (!latestChat) {
      const chat = await createAiChat({ resourceType: AiResourceTypeEnum.WORKFLOW });
      sendPrompt({ chatId: chat._id, prompt: messageToSend });
    } else if (messageToSend) {
      sendPrompt({ chatId, prompt: messageToSend });
    }
    setInputText('');
  };

  const isLoading = isFetchingWorkflow || isFetchingAiChat || areEnvironmentsInitialLoading;

  return (
    <div className="flex h-full min-w-[350px] w-[350px] flex-col overflow-hidden border-r bg-white">
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
          onSubmit={handleSendMessage}
          messages={messages}
          dataParts={dataParts}
          isSubmitDisabled={isCreatingAiChat}
        />
      )}
    </div>
  );
}
