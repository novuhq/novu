import { type AgentMessage, type AgentPendingAction, useAgentChat } from '@novu/react';
import { useState } from 'react';
import { RiArrowUpLine, RiChat3Line } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { AgentChatEmbedResources } from '@/components/agents/agent-chat-setup-content';
import { useConnectSubscriber } from '@/components/connect/connect-subscriber-provider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { InlineToast } from '@/components/primitives/inline-toast';
import { Input } from '@/components/primitives/input';
import { MarkdownText } from '@/components/primitives/markdown-text';
import { Skeleton } from '@/components/primitives/skeleton';
import { useAgentChatPrompt } from '@/hooks/use-agent-chat-prompt';
import { cn } from '@/utils/ui';

const STARTER_PROMPTS = ['Hello', 'What can you do?', 'List my MCP tools'] as const;

type AgentTryItTabProps = {
  agent: AgentResponse;
};

export function AgentTryItTab({ agent }: AgentTryItTabProps) {
  const { isReady } = useConnectSubscriber();
  const prompt = useAgentChatPrompt(agent);

  if (!isReady) {
    return (
      <div className="flex flex-col gap-3 px-4 py-4 md:px-6">
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[min(640px,calc(100vh-12rem))] flex-col px-4 py-4 md:px-6">
      <AgentChatTester agentId={agent.identifier} />

      <Accordion type="single" collapsible className="mt-3">
        <AccordionItem value="add-to-app" className="bg-bg-white">
          <AccordionTrigger className="text-label-xs text-text-sub font-medium">Add to your app</AccordionTrigger>
          <AccordionContent className="text-label-xs text-text-soft pb-2">
            <p className="mb-2 leading-4">Send a message in your app to mark the channel Connected.</p>
            <AgentChatEmbedResources prompt={prompt} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function AgentChatTester({ agentId }: { agentId: string }) {
  const [draft, setDraft] = useState('');
  const { messages, pendingActions, sendMessage, respondToAction, error, isRunning, isLoading, typing } = useAgentChat({
    agentId,
  });

  const composerDisabled = isRunning || isLoading;

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || composerDisabled) {
      return;
    }

    setDraft('');
    void sendMessage(trimmed);
  };

  const isEmpty = messages.length === 0 && !isRunning && !isLoading;

  return (
    <div className="border-stroke-soft bg-bg-white flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
      <div className="border-stroke-soft border-b px-3 py-2">
        <InlineToast
          variant="tip"
          title="Dashboard test"
          description="You're chatting as yourself. This does not mark Agent Chat connected."
        />
      </div>

      {error ? (
        <p className="text-error-base text-label-xs px-3 py-2" role="alert">
          {error.message}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
        {isEmpty ? (
          <EmptyTesterState onPickStarter={handleSend} />
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {typing || isRunning ? <p className="text-text-soft text-label-xs px-1">Agent is typing…</p> : null}
          </>
        )}
      </div>

      {pendingActions.length > 0 ? (
        <div className="border-stroke-soft flex flex-col gap-2 border-t px-3 py-2">
          {pendingActions.map((action) => (
            <PendingActionRow
              key={action.id}
              action={action}
              disabled={composerDisabled}
              onRespond={(decision) => void respondToAction({ actionId: action.id, decision })}
            />
          ))}
        </div>
      ) : null}

      <form
        className="border-stroke-soft border-t p-3"
        onSubmit={(event) => {
          event.preventDefault();
          handleSend(draft);
        }}
      >
        <Input
          size="sm"
          placeholder="Message the agent..."
          value={draft}
          disabled={composerDisabled}
          onChange={(event) => setDraft(event.target.value)}
          trailingNode={
            <div className="pr-1">
              <CompactButton
                type="submit"
                size="md"
                variant="stroke"
                fullRadius
                icon={RiArrowUpLine}
                disabled={composerDisabled || !draft.trim()}
                aria-label="Send message"
              />
            </div>
          }
        />
      </form>
    </div>
  );
}

function EmptyTesterState({ onPickStarter }: { onPickStarter: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
      <RiChat3Line className="text-text-soft size-8" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="text-label-sm text-text-strong font-medium">Preview your agent</p>
        <p className="text-label-xs text-text-soft max-w-sm leading-4">
          Send a message to see how this agent replies. Testing here does not mark Agent Chat connected.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {STARTER_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="secondary"
            mode="outline"
            size="2xs"
            onClick={() => onPickStarter(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: AgentMessage }) {
  const isUser = message.role === 'user';
  const text = message.parts
    .filter((part): part is Extract<(typeof message.parts)[number], { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('');
  const tools = message.parts.filter(
    (part): part is Extract<(typeof message.parts)[number], { type: 'tool' }> => part.type === 'tool'
  );

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      {text ? (
        <div
          className={cn(
            'text-label-xs max-w-[85%] rounded-lg px-2.5 py-2 leading-4',
            isUser ? 'bg-bg-weak text-text-strong' : 'border-stroke-soft bg-bg-white text-text-strong border',
            message.status === 'failed' && 'border-destructive/40'
          )}
        >
          {isUser ? text : <MarkdownText className="text-label-xs">{text}</MarkdownText>}
        </div>
      ) : null}
      {tools.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tools.map((tool) => (
            <span
              key={tool.toolUseId}
              className="bg-bg-weak text-text-sub text-label-xs rounded-md px-1.5 py-0.5 font-medium"
            >
              Used: {tool.toolName}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PendingActionRow({
  action,
  disabled,
  onRespond,
}: {
  action: AgentPendingAction;
  disabled: boolean;
  onRespond: (decision: 'approved' | 'denied') => void;
}) {
  if (action.type === 'mcp-connection') {
    return (
      <div className="border-stroke-soft flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
        <p className="text-label-xs text-text-sub min-w-0 truncate">Connect {action.displayName}</p>
        <Button size="2xs" variant="primary" mode="ghost" asChild>
          <a href={action.authorizeUrl} target="_blank" rel="noreferrer">
            Authorize
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="border-stroke-soft flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
      <p className="text-label-xs text-text-sub min-w-0 truncate">Approve {action.toolName}</p>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          size="2xs"
          variant="secondary"
          mode="outline"
          disabled={disabled}
          onClick={() => onRespond('denied')}
        >
          Deny
        </Button>
        <Button type="button" size="2xs" variant="primary" disabled={disabled} onClick={() => onRespond('approved')}>
          Approve
        </Button>
      </div>
    </div>
  );
}
