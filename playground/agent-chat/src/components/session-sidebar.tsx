'use client';

import type { AgentConversationStatus } from '@novu/react';
import { useEffect, useRef, useState } from 'react';
import type { ConversationSummary } from '../lib/conversations';
import { ConversationList } from './conversation-list';
import { CheckIcon, CopyIcon } from './icons';

function CopyValue({ value }: { value?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <button
      type="button"
      className="copy-value"
      onClick={copy}
      disabled={!value}
      data-copied={copied}
      title={value ? `Copy ${value}` : undefined}
    >
      <code>{value ?? <span className="value-empty">not set</span>}</code>
      <span className="copy-icon" aria-hidden>
        {copied ? <CheckIcon /> : <CopyIcon />}
      </span>
    </button>
  );
}

type SessionSidebarProps = {
  agentId: string;
  conversationId?: string;
  subscriberId: string;
  backendUrl: string;
  socketUrl: string;
  resumeDraft: string;
  onResumeDraftChange: (value: string) => void;
  onResume: () => void;
  onNewChat: () => void;
  isRunning: boolean;
  status: AgentConversationStatus;
  pendingApprovalCount: number;
  conversations: ConversationSummary[];
  conversationsLoading: boolean;
  conversationsError?: string;
  onSelectConversation: (identifier: string) => void;
  onReloadConversations: () => void;
};

export function SessionSidebar({
  agentId,
  conversationId,
  subscriberId,
  backendUrl,
  socketUrl,
  resumeDraft,
  onResumeDraftChange,
  onResume,
  onNewChat,
  isRunning,
  status,
  pendingApprovalCount,
  conversations,
  conversationsLoading,
  conversationsError,
  onSelectConversation,
  onReloadConversations,
}: SessionSidebarProps) {
  return (
    <aside className="panel session-panel" aria-label="Session">
      <div className="panel-head">
        <h2>Session</h2>
      </div>

      <div className="sidebar-body">
        <section className="sidebar-section">
          <dl className="meta-list">
            <div className="meta-row">
              <dt>Agent</dt>
              <dd>
                <CopyValue value={agentId} />
              </dd>
            </div>
            <div className="meta-row">
              <dt>Subscriber</dt>
              <dd>
                <CopyValue value={subscriberId} />
              </dd>
            </div>
            <div className="meta-row">
              <dt>Conversation</dt>
              <dd>
                <CopyValue value={conversationId} />
              </dd>
            </div>
            <div className="meta-row">
              <dt>Status</dt>
              <dd>
                <span className="runtime-pill" data-status={status}>
                  {status}
                </span>
              </dd>
            </div>
            <div className="meta-row">
              <dt>Run</dt>
              <dd>
                <span className="runtime-pill" data-running={isRunning}>
                  {isRunning ? 'running' : 'idle'}
                </span>
              </dd>
            </div>
            <div className="meta-row">
              <dt>Approvals</dt>
              <dd>
                <span className="runtime-pill" data-approvals={pendingApprovalCount > 0}>
                  {pendingApprovalCount > 0 ? `${pendingApprovalCount} pending` : 'none pending'}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        <section className="sidebar-section">
          <h3 className="sidebar-section-title">Endpoints</h3>
          <dl className="meta-list">
            <div className="meta-row">
              <dt>API</dt>
              <dd>
                <CopyValue value={backendUrl} />
              </dd>
            </div>
            <div className="meta-row">
              <dt>Socket</dt>
              <dd>
                <CopyValue value={socketUrl} />
              </dd>
            </div>
          </dl>
        </section>

        <section className="sidebar-section">
          <button type="button" className="btn btn-outline btn-block" onClick={onNewChat}>
            New conversation
          </button>
        </section>

        <ConversationList
          items={conversations}
          activeId={conversationId}
          isLoading={conversationsLoading}
          error={conversationsError}
          onSelect={onSelectConversation}
          onReload={onReloadConversations}
        />

        <section className="sidebar-section">
          <h3 className="sidebar-section-title">Resume by ID</h3>
          <form
            className="resume-form"
            onSubmit={(event) => {
              event.preventDefault();
              onResume();
            }}
          >
            <p className="hint">
              Re-mounts the hook with a <code>conversationId</code> (in-memory store only).
            </p>
            <input
              className="text-input"
              value={resumeDraft}
              onChange={(event) => onResumeDraftChange(event.target.value)}
              placeholder="conv_…"
              spellCheck={false}
              aria-label="Conversation ID"
            />
            <button type="submit" className="btn btn-outline btn-block" disabled={!resumeDraft.trim()}>
              Resume
            </button>
          </form>
        </section>
      </div>
    </aside>
  );
}
