import { AiResourceTypeEnum } from '@novu/shared';
import { generateId } from 'ai';
import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchLatestAiChat } from '@/hooks/use-fetch-latest-ai-chat';
import { BroomSparkle } from '../icons/broom-sparkle';
import { useWorkflow } from '../workflow-editor/workflow-provider';
import { ChatBody, ChatBodySkeleton } from './chat-body';
import { ChatMessage } from './types';

export function AiSidekickPanel() {
  const location = useLocation();
  const { areEnvironmentsInitialLoading } = useEnvironment();
  const { workflow } = useWorkflow();
  const { workflowSlug = '' } = useParams<{ workflowSlug?: string; stepSlug?: string }>();
  const isNewWorkflowSlug = workflowSlug === 'new';
  const prompt = location.state ? (location.state?.prompt as string | undefined) : undefined;

  const { latestChat, isPending: isFetchingChat } = useFetchLatestAiChat({
    resourceType: AiResourceTypeEnum.WORKFLOW,
    resourceId: workflow?._id,
  });
  const shouldResume = latestChat ? !!latestChat.activeStreamId : !!prompt && isNewWorkflowSlug;
  const isFetchingChatOnWorkflowEditor = isFetchingChat && !isNewWorkflowSlug;

  const initialMessages: ChatMessage[] = useMemo(() => {
    return !!prompt && isNewWorkflowSlug
      ? [{ role: 'user', id: generateId(), parts: [{ type: 'text', text: prompt }] }]
      : ((latestChat?.messages ?? []) as ChatMessage[]);
  }, [prompt, latestChat, isNewWorkflowSlug]);

  const chatId = useMemo(() => {
    if (location.state && 'chatId' in location.state) {
      return location.state.chatId as string;
    }

    return latestChat?._id ?? generateId();
  }, [location, latestChat]);

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
      {isFetchingChatOnWorkflowEditor || areEnvironmentsInitialLoading ? (
        <ChatBodySkeleton />
      ) : (
        <ChatBody chatId={chatId} prompt={prompt} resume={shouldResume} initialMessages={initialMessages} />
      )}
    </div>
  );
}
