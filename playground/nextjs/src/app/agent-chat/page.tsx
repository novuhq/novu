'use client';

/**
 * Agent Web Chat playground — Novu headless conversation hooks + AI Elements.
 *
 * The chat state (history, live SSE replies, typing, card actions) comes
 * entirely from `useConversation` / `useConversations` in @novu/react; every
 * pixel is rendered with AI Elements (https://elements.ai-sdk.dev):
 *
 * - Conversation / Message / MessageResponse — the thread
 * - PromptInput — the composer
 * - Attachments / Attachment — agent file parts (attachments component)
 * - Confirmation — tool-approval parts (approve / deny)
 * - Shimmer — the typing indicator
 *
 * Setup: set NEXT_PUBLIC_NOVU_APP_ID, NEXT_PUBLIC_NOVU_SUBSCRIBER_ID and
 * NEXT_PUBLIC_NOVU_AGENT_ID in .env, and add the "Web Chat" channel to the
 * agent in the Novu dashboard.
 */

import type { ConversationMessage, ConversationMessagePart } from '@novu/react';
import { ConversationCard, NovuProvider, useConversation, useConversations } from '@novu/react';
import { MessageSquareIcon, PlusIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Attachment, AttachmentInfo, AttachmentPreview, Attachments } from '@/components/ai-elements/attachments';
import {
  Confirmation,
  ConfirmationAccepted,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRejected,
  ConfirmationRequest,
  ConfirmationTitle,
} from '@/components/ai-elements/confirmation';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { novuConfig } from '@/utils/config';

const AGENT_ID = process.env.NEXT_PUBLIC_NOVU_AGENT_ID ?? '';

function newConversationId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

/** Tailwind styling for the unstyled @novu/react <ConversationCard> via its data-novu-element hooks. */
const CARD_STYLES = [
  'rounded-lg border bg-card p-4 text-sm',
  "[&_[data-novu-element='card-title']]:text-base [&_[data-novu-element='card-title']]:font-semibold",
  "[&_[data-novu-element='card-subtitle']]:text-muted-foreground [&_[data-novu-element='card-subtitle']]:text-xs",
  "[&_[data-novu-element='text']]:my-1.5",
  "[&_[data-novu-element='divider']]:my-3 [&_[data-novu-element='divider']]:border-border",
  "[&_[data-novu-element='actions']]:mt-3 [&_[data-novu-element='actions']]:flex [&_[data-novu-element='actions']]:flex-wrap [&_[data-novu-element='actions']]:gap-2",
  "[&_[data-novu-element='button']]:cursor-pointer [&_[data-novu-element='button']]:rounded-md [&_[data-novu-element='button']]:border [&_[data-novu-element='button']]:px-3 [&_[data-novu-element='button']]:py-1.5 [&_[data-novu-element='button']]:text-sm [&_[data-novu-element='button']]:font-medium [&_[data-novu-element='button']]:transition-colors hover:[&_[data-novu-element='button']]:bg-accent",
  "[&_[data-novu-element='button'][data-novu-style='primary']]:border-transparent [&_[data-novu-element='button'][data-novu-style='primary']]:bg-primary [&_[data-novu-element='button'][data-novu-style='primary']]:text-primary-foreground",
  "[&_[data-novu-element='button'][data-novu-style='danger']]:border-transparent [&_[data-novu-element='button'][data-novu-style='danger']]:bg-destructive [&_[data-novu-element='button'][data-novu-style='danger']]:text-white",
  "[&_[data-novu-element='link-button']]:text-primary [&_[data-novu-element='link-button']]:underline",
  "[&_[data-novu-element='image']]:my-2 [&_[data-novu-element='image']]:max-w-full [&_[data-novu-element='image']]:rounded-md",
  "[&_[data-novu-element='fields']]:my-2 [&_[data-novu-element='fields']]:grid [&_[data-novu-element='fields']]:grid-cols-2 [&_[data-novu-element='fields']]:gap-1",
  "[&_[data-novu-element='field-title']]:text-xs [&_[data-novu-element='field-title']]:font-medium [&_[data-novu-element='field-title']]:text-muted-foreground",
].join(' ');

type SendAction = (actionId: string, value?: string, sourceMessageId?: string) => Promise<unknown>;

function MessagePart({
  part,
  index,
  message,
  sendAction,
}: {
  part: ConversationMessagePart;
  index: number;
  message: ConversationMessage;
  sendAction: SendAction;
}) {
  switch (part.type) {
    case 'text':
      return message.role === 'agent' ? (
        <MessageResponse>{part.markdown}</MessageResponse>
      ) : (
        <span className="whitespace-pre-wrap">{part.markdown}</span>
      );

    case 'card':
      return (
        <div className={CARD_STYLES}>
          <ConversationCard card={part.card} onAction={(actionId, value) => sendAction(actionId, value, message.id)} />
        </div>
      );

    case 'file':
      return (
        <Attachments variant="inline">
          <a href={part.url} target="_blank" rel="noreferrer noopener">
            <Attachment
              data={{
                id: `${message.id}-file-${index}`,
                type: 'file',
                url: part.url,
                filename: part.filename,
                mediaType: part.mimeType ?? 'application/octet-stream',
              }}
            >
              <AttachmentPreview />
              <AttachmentInfo />
            </Attachment>
          </a>
        </Attachments>
      );

    case 'toolApproval':
      return (
        <Confirmation
          approval={
            part.status === 'pending'
              ? { id: part.approvalId }
              : { id: part.approvalId, approved: part.status === 'approved' }
          }
          state={part.status === 'pending' ? 'approval-requested' : 'approval-responded'}
        >
          <ConfirmationTitle>
            The agent wants to run <strong>{part.toolName ?? 'a tool'}</strong>.
            <ConfirmationRequest> Approve to continue.</ConfirmationRequest>
            <ConfirmationAccepted> You approved this tool.</ConfirmationAccepted>
            <ConfirmationRejected> You denied this tool.</ConfirmationRejected>
          </ConfirmationTitle>
          <ConfirmationActions>
            <ConfirmationAction
              variant="outline"
              onClick={() => sendAction(`tool-approval:deny:${part.approvalId}`, undefined, message.id)}
            >
              Deny
            </ConfirmationAction>
            <ConfirmationAction
              onClick={() => sendAction(`tool-approval:approve:${part.approvalId}`, undefined, message.id)}
            >
              Approve
            </ConfirmationAction>
          </ConfirmationActions>
        </Confirmation>
      );

    default:
      return null;
  }
}

function ConversationSidebar({
  agent,
  activeConversationId,
  onSelect,
  onNew,
}: {
  agent: string;
  activeConversationId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const { conversations, isLoading } = useConversations({ agent });

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Conversations</h2>
        <button
          type="button"
          onClick={onNew}
          className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-accent"
          title="New conversation"
        >
          <PlusIcon className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && <p className="px-2 py-1 text-xs text-muted-foreground">Loading…</p>}
        {conversations?.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            onClick={() => onSelect(conversation.id)}
            className={`w-full rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent ${
              conversation.id === activeConversationId ? 'bg-accent font-medium' : ''
            }`}
          >
            <span className="block truncate">{conversation.title || 'Untitled conversation'}</span>
            {conversation.lastMessagePreview && (
              <span className="block truncate text-xs text-muted-foreground">{conversation.lastMessagePreview}</span>
            )}
          </button>
        ))}
        {!isLoading && !conversations?.length && (
          <p className="px-2 py-1 text-xs text-muted-foreground">No conversations yet — say hi!</p>
        )}
      </div>
    </aside>
  );
}

function AgentChat() {
  const [conversationId, setConversationId] = useState(newConversationId);
  const [input, setInput] = useState('');

  const { messages, sendMessage, sendAction, isStreaming, isTyping, typingStatus, isLoading, error } = useConversation({
    agent: AGENT_ID,
    conversationId,
  });

  const handleSubmit = useCallback(
    (message: { text: string }) => {
      const text = message.text.trim();
      if (!text || isStreaming) return;
      setInput('');
      void sendMessage(text);
    },
    [isStreaming, sendMessage]
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <ConversationSidebar
        agent={AGENT_ID}
        activeConversationId={conversationId}
        onSelect={setConversationId}
        onNew={() => setConversationId(newConversationId())}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              <MessageSquareIcon className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">Agent Web Chat</h1>
              <p className="text-xs text-muted-foreground">
                @novu/react headless hooks (<code>useConversation</code>) rendered with AI Elements
              </p>
            </div>
          </div>
        </div>

        <Conversation className="flex-1">
          <ConversationContent>
            {!isLoading && messages.length === 0 && (
              <ConversationEmptyState
                icon={<MessageSquareIcon className="size-8" />}
                title="Start a conversation"
                description="Messages route through the Novu web channel to your agent — replies stream back here."
              />
            )}

            {messages.map((message) => (
              <Message key={message.id} from={message.role === 'agent' ? 'assistant' : 'user'}>
                <MessageContent>
                  {message.parts.map((part, index) => (
                    <MessagePart
                      // biome-ignore lint/suspicious/noArrayIndexKey: parts have no stable ids
                      key={`${message.id}-${index}`}
                      part={part}
                      index={index}
                      message={message}
                      sendAction={sendAction}
                    />
                  ))}
                  {message.status === 'failed' && (
                    <span className="text-xs text-destructive">Failed to send — try again.</span>
                  )}
                </MessageContent>
              </Message>
            ))}

            {isTyping && (
              <Message from="assistant">
                <MessageContent>
                  <Shimmer className="text-sm">{typingStatus || 'Thinking…'}</Shimmer>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {error && (
          <div className="mx-4 mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error.message}
          </div>
        )}

        <div className="shrink-0 border-t px-4 py-3">
          <PromptInput onSubmit={handleSubmit} className="max-w-full">
            <PromptInputTextarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask the agent anything…"
              disabled={isStreaming}
            />
            <PromptInputFooter>
              <div />
              <PromptInputSubmit status={isStreaming ? 'streaming' : 'ready'} onStop={() => {}} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

export default function AgentChatPage() {
  if (!novuConfig.applicationIdentifier || !novuConfig.subscriberId || !AGENT_ID) {
    return (
      <main className="mx-auto max-w-xl p-10 font-sans">
        <h1 className="text-lg font-semibold">Agent Web Chat playground</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Set <code>NEXT_PUBLIC_NOVU_APP_ID</code>, <code>NEXT_PUBLIC_NOVU_SUBSCRIBER_ID</code> and{' '}
          <code>NEXT_PUBLIC_NOVU_AGENT_ID</code> in <code>playground/nextjs/.env</code>, then add the &quot;Web
          Chat&quot; channel to that agent in the Novu dashboard.
        </p>
      </main>
    );
  }

  return (
    <NovuProvider
      applicationIdentifier={novuConfig.applicationIdentifier}
      subscriberId={novuConfig.subscriberId}
      backendUrl={novuConfig.backendUrl}
    >
      <AgentChat />
    </NovuProvider>
  );
}
