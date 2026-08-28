'use client';

import type { AgentConversationStatus } from '@novu/react';
import { useEffect, useRef, useState } from 'react';
import type { ConversationSummary } from '../lib/conversations';
import type { RunOrigin, RunTransition } from '../lib/run-activity';
import type { SocketStatus } from '../lib/socket-status';
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

/** `restored` marks a run picked up from history replay rather than a live `run-start`. */
const RUN_LABEL: Record<RunOrigin, string> = {
  idle: 'idle',
  live: 'running',
  restored: 'running · restored',
};

function formatClock(at: number): string {
  return new Date(at).toLocaleTimeString();
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
  runOrigin: RunOrigin;
  lastRunTransition?: RunTransition;
  status: AgentConversationStatus;
  socketStatus: SocketStatus;
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
  runOrigin,
  lastRunTransition,
  status,
  socketStatus,
  pendingApprovalCount,
  conversations,
  conversationsLoading,
  conversationsError,
  onSelectConversation,
  onReloadConversations,
}: SessionSidebarProps) {
  return (
    <>
      <aside className="panel session-panel" aria-label="Conversations">
        <div className="panel-head">
          <h2>Conversations</h2>
          <button type="button" className="btn btn-primary" onClick={onNewChat}>
            New
          </button>
        </div>

        <div className="sidebar-body">
          <ConversationList
            items={conversations}
            activeId={conversationId}
            isLoading={conversationsLoading}
            error={conversationsError}
            onSelect={onSelectConversation}
            onReload={onReloadConversations}
          />

          <section className="sidebar-section">
            <h3 className="sidebar-section-title">Open by ID</h3>
            <form
              className="resume-form"
              onSubmit={(event) => {
                event.preventDefault();
                onResume();
              }}
            >
              <input
                className="text-input"
                value={resumeDraft}
                onChange={(event) => onResumeDraftChange(event.target.value)}
                placeholder="conv_…"
                spellCheck={false}
                aria-label="Conversation ID"
              />
              <button type="submit" className="btn btn-outline btn-block" disabled={!resumeDraft.trim()}>
                Open
              </button>
            </form>
          </section>
        </div>
      </aside>

      <details className="session-details">
        <summary className="session-details-trigger">
          <span>Session</span>
          <span className="session-connection" data-state={socketStatus}>
            {socketStatus === 'online' ? 'Connected' : socketStatus}
          </span>
        </summary>

        <div className="panel session-details-card">
          <div className="panel-head">
            <h2>Session details</h2>
            <span className="runtime-pill" data-running={isRunning}>
              {isRunning ? RUN_LABEL[runOrigin] : 'idle'}
            </span>
          </div>

          <div className="session-details-body">
            <section className="session-details-group">
              <h3>Identifiers</h3>
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
              </dl>
            </section>

            <section className="session-details-group">
              <h3>Activity</h3>
              <dl className="session-stats">
                <div className="session-stat">
                  <dt>Status</dt>
                  <dd>{status}</dd>
                </div>
                <div className="session-stat">
                  <dt>Approvals</dt>
                  <dd>{pendingApprovalCount > 0 ? `${pendingApprovalCount} pending` : 'None'}</dd>
                </div>
              </dl>
              {lastRunTransition ? (
                <p className="session-transition">
                  Last event: {lastRunTransition.type} at {formatClock(lastRunTransition.at)}
                </p>
              ) : null}
            </section>

            <section className="session-details-group">
              <h3>Endpoints</h3>
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
          </div>
        </div>
      </details>
    </>
  );
}
