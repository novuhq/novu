'use client';

import type { AgentMessage } from '@novu/react';
import { formatTime } from '../lib/message-utils';
import { ApprovalCard, type RespondToApproval } from './approval-card';
import { SparkIcon, UserIcon } from './icons';

type AgentMessagePart = AgentMessage['parts'][number];

function PartBlock({ part, onRespond }: { part: AgentMessagePart; onRespond?: RespondToApproval }) {
  switch (part.type) {
    case 'text':
      return (
        <p className="part part-text">
          {part.text}
          {part.state === 'streaming' ? <span className="stream-cursor" aria-hidden /> : null}
        </p>
      );
    case 'thinking':
      return (
        <details className="part part-block" open={part.state === 'streaming'}>
          <summary>
            <span className="part-label">Thinking{part.state === 'streaming' ? '…' : ''}</span>
          </summary>
          <pre className="part-json">{part.text || '(empty)'}</pre>
        </details>
      );
    case 'tool':
      return (
        <div className="part part-block">
          <div className="part-block-head">
            <span className="part-label">Tool</span>
            <code>{part.toolName}</code>
            <span className="part-badge" data-state={part.state}>
              {part.state}
            </span>
          </div>
          {part.input ? <pre className="part-json">{JSON.stringify(part.input, null, 2)}</pre> : null}
          {part.output ? <pre className="part-json">{JSON.stringify(part.output, null, 2)}</pre> : null}
        </div>
      );
    case 'approval':
      return <ApprovalCard part={part} onRespond={onRespond} />;
    case 'source':
      return (
        <div className="part part-block">
          <div className="part-block-head">
            <span className="part-label">{part.sourceType}</span>
            <span>{part.title ?? part.filename ?? part.url ?? 'source'}</span>
          </div>
        </div>
      );
    case 'file':
      return (
        <div className="part part-block">
          <div className="part-block-head">
            <span className="part-label">File</span>
            <span>{part.name ?? part.fileId}</span>
            {part.mediaType ? <span className="part-muted">{part.mediaType}</span> : null}
          </div>
        </div>
      );
    case 'card':
      return (
        <div className="part part-block">
          <div className="part-block-head">
            <span className="part-label">Card</span>
          </div>
          <pre className="part-json">{JSON.stringify(part.card, null, 2)}</pre>
        </div>
      );
    default:
      return null;
  }
}

export function MessageRow({ message, onRespond }: { message: AgentMessage; onRespond?: RespondToApproval }) {
  const isUser = message.role === 'user';

  return (
    <article className={`msg ${isUser ? 'msg-user' : 'msg-assistant'}`} data-status={message.status}>
      <div className="msg-avatar" aria-hidden>
        {isUser ? <UserIcon /> : <SparkIcon size={15} />}
      </div>
      <div className="msg-content">
        <div className="msg-meta">
          <span className="msg-author">{isUser ? 'You' : 'Agent'}</span>
          <span>{formatTime(message.createdAt)}</span>
          {message.status !== 'sent' ? (
            <span className="msg-status" data-status={message.status}>
              {message.status}
            </span>
          ) : null}
        </div>
        <div className="msg-bubble">
          {message.parts.map((part, index) => (
            <PartBlock key={`${message.id}-${index}`} part={part} onRespond={onRespond} />
          ))}
        </div>
      </div>
    </article>
  );
}
