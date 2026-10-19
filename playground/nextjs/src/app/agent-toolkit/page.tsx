'use client';

import { useChat } from '@ai-sdk/react';
import { Inbox } from '@novu/nextjs';
import { DefaultChatTransport, getToolName, isToolUIPart } from 'ai';
import { useEffect, useState } from 'react';
import { Conversation, ConversationContent, ConversationEmptyState } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { novuConfig } from '@/utils/config';

function ToolStatusCard({ result, toolCallId }: { result: unknown; toolCallId: string }) {
  const [displayResult, setDisplayResult] = useState(result);

  useEffect(() => {
    const data = displayResult as Record<string, unknown> | null;
    if (!data || data.type !== 'tool-status' || data.status !== 'pending-input') return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/agent-toolkit/result?toolCallId=${toolCallId}`);
        const json = await res.json();
        if (json.resolved) {
          setDisplayResult(json.result);
        }
      } catch {
        // ignore
      }
    };

    poll();
    const interval = setInterval(poll, 1500);

    return () => clearInterval(interval);
  }, [toolCallId, displayResult]);

  if (!displayResult || typeof displayResult !== 'object') return null;

  const data = displayResult as Record<string, unknown>;

  if (data.type !== 'tool-status') return null;

  const status = data.status as string;

  if (status === 'pending-input') {
    return (
      <div className="mt-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950">
        <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          Waiting for approval...
        </div>
        <p className="mt-1 text-amber-600 dark:text-amber-500">
          A refund request has been sent for human review. Check the Inbox panel on the right to approve or reject it.
        </p>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="mt-1 rounded-md border border-red-200 bg-red-50 p-3 text-sm dark:border-red-800 dark:bg-red-950">
        <div className="font-medium text-red-700 dark:text-red-400">Refund Rejected</div>
        {data.message ? <p className="mt-1 text-red-600 dark:text-red-500">{String(data.message)}</p> : null}
      </div>
    );
  }

  if (status === 'completed' && data.result) {
    const refund = data.result as Record<string, unknown>;

    return (
      <div className="mt-1 rounded-md border border-green-200 bg-green-50 p-3 text-sm dark:border-green-800 dark:bg-green-950">
        <div className="font-medium text-green-700 dark:text-green-400">Refund Approved & Processed</div>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {Object.entries(refund).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-medium text-green-600 dark:text-green-500 capitalize">{k}</dt>
              <dd className="text-green-700 dark:text-green-400">{String(v)}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return null;
}

async function sendDecision(
  notification: { data?: unknown; archive: () => unknown },
  decision: { type: 'approve' } | { type: 'reject'; message: string }
) {
  const toolCallId = (notification.data as Record<string, unknown> | undefined)?.toolCallId;

  if (!toolCallId) return;

  await fetch('/api/agent-toolkit/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolCallId, decision }),
  });

  notification.archive();
}

function ApprovalInbox() {
  return (
    <div className="flex h-full flex-col border-l bg-background">
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold text-sm">Manager Inbox</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Approve or reject refund requests in real-time</p>
      </div>

      <div className="flex-1 overflow-hidden p-3">
        <Inbox
          {...novuConfig}
          appearance={{
            elements: {
              bellContainer: 'hidden',
              popoverContent: 'static! shadow-none! border-none! w-full! max-w-full! h-full!',
              popoverTrigger: 'hidden',
            },
          }}
          open
          // biome-ignore lint/suspicious/noExplicitAny: Notification type is not available as a direct dependency
          onPrimaryActionClick={(notification: any) => sendDecision(notification, { type: 'approve' })}
          // biome-ignore lint/suspicious/noExplicitAny: Notification type is not available as a direct dependency
          onSecondaryActionClick={(notification: any) =>
            sendDecision(notification, { type: 'reject', message: 'Rejected by reviewer' })
          }
        />
      </div>
    </div>
  );
}

export default function AgentToolkitPage() {
  const [input, setInput] = useState('');

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/agent-toolkit/chat' }),
  });

  const isGenerating = status === 'streaming' || status === 'submitted';

  const handleSubmit = (message: { text: string }) => {
    if (!message.text.trim() || isGenerating) return;
    sendMessage({ text: message.text });
    setInput('');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col min-w-0">
        <div className="border-b px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
              AI
            </div>
            <div>
              <h1 className="font-semibold text-sm">Refund Agent</h1>
              <p className="text-xs text-muted-foreground">Human-in-the-Loop demo — refunds require manager approval</p>
            </div>
          </div>
        </div>

        <Conversation className="flex-1">
          <ConversationContent>
            {messages.length === 0 && (
              <ConversationEmptyState
                title="Start a conversation"
                description={'Try: "Refund order #ORD-1234 for $49.99, broken product"'}
              />
            )}

            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    if (part.type === 'text') {
                      if (message.role === 'assistant') {
                        return <MessageResponse key={i}>{part.text}</MessageResponse>;
                      }

                      return <span key={i}>{part.text}</span>;
                    }

                    if (isToolUIPart(part)) {
                      const toolName = getToolName(part);
                      const toolCallId = part.toolCallId;

                      if (part.state === 'output-available') {
                        return <ToolStatusCard key={toolCallId} result={part.output} toolCallId={toolCallId} />;
                      }

                      return (
                        <div key={toolCallId} className="text-xs text-muted-foreground italic">
                          Calling {toolName}...
                        </div>
                      );
                    }

                    return null;
                  })}
                </MessageContent>
              </Message>
            ))}
          </ConversationContent>
        </Conversation>

        <div className="border-t px-4 py-3 shrink-0">
          <PromptInput onSubmit={handleSubmit} className="max-w-full">
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='e.g. "Refund order #ORD-1234 for $49.99, broken product"'
              disabled={isGenerating}
            />
            <PromptInputFooter>
              <div />
              <PromptInputSubmit status={status} onStop={() => {}} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>

      <div className="w-100 shrink-0">
        <ApprovalInbox />
      </div>
    </div>
  );
}
