'use client';

import { DefaultChatTransport, isToolUIPart, getToolName } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';

type HumanDecision =
  | { type: 'approve' }
  | { type: 'edit'; args: Record<string, unknown> }
  | { type: 'reject'; message: string };

type PendingApproval = {
  id: string;
  toolCall: {
    id: string;
    method: string;
    args: unknown;
  };
  createdAt: string;
};

function ToolStatusCard({ result }: { result: unknown }) {
  if (!result || typeof result !== 'object') return null;

  const data = result as Record<string, unknown>;

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
          A refund request has been sent for human review. Use the simulator panel on the right to approve, edit, or
          reject it.
        </p>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="mt-1 rounded-md border border-red-200 bg-red-50 p-3 text-sm dark:border-red-800 dark:bg-red-950">
        <div className="font-medium text-red-700 dark:text-red-400">Refund Rejected</div>
        {data.message ? (
          <p className="mt-1 text-red-600 dark:text-red-500">{String(data.message)}</p>
        ) : null}
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

function ApprovalSimulator() {
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({});
  const [rejectMessages, setRejectMessages] = useState<Record<string, string>>({});
  const [activeAction, setActiveAction] = useState<Record<string, 'edit' | 'reject' | null>>({});

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/agent-toolkit/pending');
        const data = await res.json();
        setPending(data.pending ?? []);
      } catch {
        // ignore
      }
    };

    poll();
    const interval = setInterval(poll, 2000);

    return () => clearInterval(interval);
  }, []);

  const sendDecision = async (approval: PendingApproval, decision: HumanDecision) => {
    await fetch('/api/agent-toolkit/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolCallId: approval.toolCall.id, decision }),
    });
    setPending((prev) => prev.filter((p) => p.id !== approval.id));
    setActiveAction((prev) => ({ ...prev, [approval.id]: null }));
  };

  return (
    <div className="flex h-full flex-col border-l bg-background">
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold text-sm">Approval Simulator</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Simulates a manager reviewing refund requests</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
            <div className="text-3xl">🔔</div>
            <p className="text-sm font-medium">No pending approvals</p>
            <p className="text-xs">Ask the agent to issue a refund to see approvals here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((approval) => {
              const args = approval.toolCall.args as Record<string, unknown>;
              const action = activeAction[approval.id];

              return (
                <div key={approval.id} className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Refund Request
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(approval.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <dl className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Order</dt>
                        <dd className="font-medium">{String(args.orderId ?? '—')}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Amount</dt>
                        <dd className="font-medium text-red-600">${String(args.amount ?? '0')}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground shrink-0">Reason</dt>
                        <dd className="font-medium text-right">{String(args.reason ?? '—')}</dd>
                      </div>
                    </dl>
                  </div>

                  {action === 'edit' && (
                    <div className="mb-3 rounded-md border bg-muted/50 p-3">
                      <label htmlFor={`edit-amount-${approval.id}`} className="block text-xs font-medium text-muted-foreground mb-1">New amount (USD)</label>
                      <input
                        id={`edit-amount-${approval.id}`}
                        type="number"
                        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder={String(args.amount ?? '')}
                        value={editAmounts[approval.id] ?? ''}
                        onChange={(e) => setEditAmounts((prev) => ({ ...prev, [approval.id]: e.target.value }))}
                      />
                    </div>
                  )}

                  {action === 'reject' && (
                    <div className="mb-3 rounded-md border bg-muted/50 p-3">
                      <label htmlFor={`reject-msg-${approval.id}`} className="block text-xs font-medium text-muted-foreground mb-1">Rejection reason</label>
                      <input
                        id={`reject-msg-${approval.id}`}
                        type="text"
                        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="e.g. Exceeds refund policy limit"
                        value={rejectMessages[approval.id] ?? ''}
                        onChange={(e) => setRejectMessages((prev) => ({ ...prev, [approval.id]: e.target.value }))}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    {!action ? (
                      <>
                        <button
                          onClick={() => sendDecision(approval, { type: 'approve' })}
                          className="flex-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setActiveAction((prev) => ({ ...prev, [approval.id]: 'edit' }))}
                          className="flex-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                        >
                          Edit & Approve
                        </button>
                        <button
                          onClick={() => setActiveAction((prev) => ({ ...prev, [approval.id]: 'reject' }))}
                          className="flex-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    ) : action === 'edit' ? (
                      <>
                        <button
                          onClick={() => {
                            const newAmount = parseFloat(editAmounts[approval.id] ?? '');
                            if (Number.isNaN(newAmount)) return;
                            sendDecision(approval, { type: 'edit', args: { ...args, amount: newAmount } });
                          }}
                          className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                          Confirm Edit
                        </button>
                        <button
                          onClick={() => setActiveAction((prev) => ({ ...prev, [approval.id]: null }))}
                          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            sendDecision(approval, {
                              type: 'reject',
                              message: rejectMessages[approval.id] ?? 'Rejected by reviewer',
                            })
                          }
                          className="flex-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                        >
                          Confirm Rejection
                        </button>
                        <button
                          onClick={() => setActiveAction((prev) => ({ ...prev, [approval.id]: null }))}
                          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
              <p className="text-xs text-muted-foreground">
                Human-in-the-Loop demo — refunds require manager approval
              </p>
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
                        return <ToolStatusCard key={toolCallId} result={part.output} />;
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
          <PromptInput
            onSubmit={handleSubmit}
            className="max-w-full"
          >
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

      <div className="w-80 shrink-0">
        <ApprovalSimulator />
      </div>
    </div>
  );
}
