'use client';

import { type ConversationSummary, relativeTime } from '../lib/conversations';
import { ChatIcon } from './icons';

type ConversationListProps = {
  items: ConversationSummary[];
  activeId?: string;
  isLoading: boolean;
  error?: string;
  onSelect: (identifier: string) => void;
  onReload: () => void;
};

export function ConversationList({ items, activeId, isLoading, error, onSelect, onReload }: ConversationListProps) {
  return (
    <section className="sidebar-section">
      <div className="sidebar-section-head">
        <h3 className="sidebar-section-title">Recent</h3>
        <button type="button" className="btn btn-ghost" onClick={onReload} disabled={isLoading}>
          {isLoading ? 'Loading' : 'Refresh'}
        </button>
      </div>

      {error ? <p className="hint hint-error">{error}</p> : null}

      {items.length === 0 && !error ? (
        <p className="hint">{isLoading ? 'Loading conversations…' : 'No conversations yet.'}</p>
      ) : null}

      <ul className="conv-list">
        {items.map((item) => (
          <li key={item.identifier}>
            <button
              type="button"
              className="conv-item"
              data-active={item.identifier === activeId}
              onClick={() => onSelect(item.identifier)}
              title={item.identifier}
            >
              <span className="conv-glyph" aria-hidden>
                <ChatIcon size={13} />
              </span>
              <span className="conv-body">
                <span className="conv-title">{item.title || item.identifier}</span>
                <span className="conv-sub">{relativeTime(item.lastActivityAt)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
