'use client';

import { useNovu } from '@novu/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createDebugEvent,
  type DebugEvent,
  type DebugEventSource,
  emitDebugEvent,
  SDK_DEBUG_EVENTS,
  subscribeDebugEvents,
} from '../lib/debug-events';

type Filter = 'all' | DebugEventSource;

function formatClock(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  }).format(new Date(ts));
}

function payloadPreview(payload: unknown): string {
  if (payload === undefined) return '';
  try {
    const text = JSON.stringify(payload, null, 2);
    return text.length > 1200 ? `${text.slice(0, 1200)}…` : text;
  } catch {
    return String(payload);
  }
}

export function useDebugLog() {
  const [events, setEvents] = useState<DebugEvent[]>([]);

  useEffect(
    () =>
      subscribeDebugEvents((event) => {
        setEvents((prev) => [event, ...prev].slice(0, 300));
      }),
    []
  );

  const push = useCallback((event: Omit<DebugEvent, 'id' | 'ts'>) => {
    emitDebugEvent(event);
  }, []);

  const clear = useCallback(() => setEvents([]), []);

  return { events, push, clear };
}

export function SdkEventBridge() {
  const novu = useNovu();

  useEffect(() => {
    const cleanups = SDK_DEBUG_EVENTS.map((eventName) =>
      novu.on(eventName, (payload) => {
        emitDebugEvent({ source: 'sdk', name: eventName, payload });
      })
    );

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [novu]);

  return null;
}

const FILTERS: readonly Filter[] = ['all', 'http', 'ws', 'sdk'];

export function DebugInspector({ events, onClear }: { events: DebugEvent[]; onClear: () => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === 'all' ? events : events.filter((event) => event.source === filter)),
    [events, filter]
  );

  const counts = useMemo(
    () => ({
      all: events.length,
      http: events.filter((e) => e.source === 'http').length,
      ws: events.filter((e) => e.source === 'ws').length,
      sdk: events.filter((e) => e.source === 'sdk').length,
    }),
    [events]
  );

  return (
    <aside className="panel debug-panel" aria-label="Event inspector">
      <div className="panel-head">
        <h2>Network</h2>
        <button type="button" className="btn btn-ghost" onClick={onClear} disabled={events.length === 0}>
          Clear
        </button>
      </div>

      <div className="debug-filters" role="tablist" aria-label="Event source filter">
        {FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={filter === key ? 'filter active' : 'filter'}
            onClick={() => setFilter(key)}
          >
            {key}
            <span className="filter-count">{counts[key]}</span>
          </button>
        ))}
      </div>

      <ol className="debug-list">
        {filtered.length === 0 ? (
          <li className="debug-empty">
            HTTP calls to the Novu API, WebSocket frames and SDK events show up here as they happen.
          </li>
        ) : (
          filtered.map((event) => {
            const open = expanded === event.id;
            return (
              <li key={event.id} className={`debug-item source-${event.source}`}>
                <button
                  type="button"
                  className="debug-row"
                  onClick={() => setExpanded(open ? null : event.id)}
                  aria-expanded={open}
                >
                  <time dateTime={new Date(event.ts).toISOString()}>{formatClock(event.ts)}</time>
                  <span className="debug-src-dot" aria-label={event.source} />
                  <span className="debug-name">{event.name}</span>
                </button>
                {open && event.payload !== undefined ? (
                  <pre className="debug-payload">{payloadPreview(event.payload)}</pre>
                ) : null}
              </li>
            );
          })
        )}
      </ol>
    </aside>
  );
}
