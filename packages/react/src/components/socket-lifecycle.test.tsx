import { act, render } from '@testing-library/react';
import React, { StrictMode, useMemo } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NovuProvider } from '../hooks/NovuProvider';
import { useCounts } from '../hooks/useCounts';
import { Inbox } from './Inbox';

class FakeWebSocket extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  CONNECTING = 0;
  OPEN = 1;
  CLOSING = 2;
  CLOSED = 3;
  readyState = FakeWebSocket.CONNECTING;
  binaryType = 'blob';
  bufferedAmount = 0;
  extensions = '';
  protocol = '';
  url: string;

  constructor(url: string) {
    super();
    this.url = url;
    FakeWebSocket.instances.push(this);
    setTimeout(() => {
      if (this.readyState !== FakeWebSocket.CONNECTING) return;
      this.readyState = FakeWebSocket.OPEN;
      this.dispatchEvent(new Event('open'));
    }, 0);
  }

  send() {}

  close(code = 1000, reason = '') {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    const event = Object.assign(new Event('close'), { code, reason, wasClean: true });
    setTimeout(() => this.dispatchEvent(event), 0);
  }

  /** Simulates the server dropping the connection (deploy, idle timeout, network blip). */
  drop() {
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatchEvent(Object.assign(new Event('close'), { code: 1006, reason: '', wasClean: false }));
  }

  get token() {
    return new URL(this.url).searchParams.get('token');
  }
}

let sessionCount = 0;

const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

const fakeFetch = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes('/inbox/session')) {
    sessionCount += 1;

    return json({
      data: {
        token: `token-${sessionCount}`,
        totalUnreadCount: 0,
        unreadCount: { total: 0, severity: {} },
        removeNovuBranding: false,
        isDevelopmentMode: false,
        maxSnoozeDurationHours: 24,
        contextKeys: [],
      },
    });
  }
  if (url.includes('/notifications/count')) {
    return json({ data: [{ count: 0, filter: {} }] });
  }
  if (url.includes('/notifications')) {
    return json({ data: [], hasMore: false, filter: {} });
  }

  return json({ data: [] });
});

const openSockets = () => FakeWebSocket.instances.filter((ws) => ws.readyState !== FakeWebSocket.CLOSED);
const flush = (ms = 20) => act(async () => new Promise((resolve) => setTimeout(resolve, ms)));

beforeEach(() => {
  FakeWebSocket.instances = [];
  sessionCount = 0;
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.stubGlobal('fetch', fakeFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The setup from NV-7172: every object prop is written inline, so each render passes new references. */
const InlinePropsApp = ({ tick, tenant = 'org_1' }: { tick: number; tenant?: string }) => (
  <div data-tick={tick}>
    <Inbox
      applicationIdentifier="app"
      subscriber={{ subscriberId: 'user_1', firstName: 'Ada' }}
      context={{ tenant: { id: tenant } }}
      socketOptions={{ minReconnectionDelay: 10, maxReconnectionDelay: 20 }}
    />
  </div>
);

const MemoizedPropsApp = ({ tick }: { tick: number }) => {
  const subscriber = useMemo(() => ({ subscriberId: 'user_1', firstName: 'Ada' }), []);
  const context = useMemo(() => ({ tenant: { id: 'org_1' } }), []);

  return (
    <div data-tick={tick}>
      <Inbox applicationIdentifier="app" subscriber={subscriber} context={context} />
    </div>
  );
};

const RERENDERS = 5;

describe('Inbox realtime socket lifecycle', () => {
  it('reuses one session and socket when the parent re-renders with equal inline props', async () => {
    const view = render(<InlinePropsApp tick={0} />);
    await flush();

    for (let tick = 1; tick <= RERENDERS; tick += 1) {
      view.rerender(<InlinePropsApp tick={tick} />);
      await flush();
    }

    expect(sessionCount).toBe(1);
    expect(openSockets().map((ws) => ws.token)).toEqual(['token-1']);
  });

  it('reuses one session and socket when the props are memoized', async () => {
    const view = render(<MemoizedPropsApp tick={0} />);
    await flush();

    for (let tick = 1; tick <= RERENDERS; tick += 1) {
      view.rerender(<MemoizedPropsApp tick={tick} />);
      await flush();
    }

    expect(sessionCount).toBe(1);
    expect(openSockets()).toHaveLength(1);
  });

  it('closes the previous socket when the context changes', async () => {
    const view = render(<InlinePropsApp tick={0} tenant="org_0" />);
    await flush();

    for (let tick = 1; tick <= RERENDERS; tick += 1) {
      view.rerender(<InlinePropsApp tick={tick} tenant={`org_${tick}`} />);
      await flush();
    }

    expect(sessionCount).toBe(RERENDERS + 1);
    expect(openSockets().map((ws) => ws.token)).toEqual([`token-${RERENDERS + 1}`]);
  });

  it('closes its socket when the Inbox unmounts', async () => {
    const view = render(<InlinePropsApp tick={0} />);
    await flush();
    expect(openSockets()).toHaveLength(1);

    view.unmount();
    await flush();

    expect(openSockets()).toHaveLength(0);
  });

  it('keeps the live socket open under StrictMode', async () => {
    render(
      <StrictMode>
        <InlinePropsApp tick={0} />
      </StrictMode>
    );
    await flush();

    expect(openSockets()).toHaveLength(1);
  });

  it('reconnects only the live socket after the server drops the connection', async () => {
    const view = render(<InlinePropsApp tick={0} tenant="org_0" />);
    await flush();

    for (let tick = 1; tick <= RERENDERS; tick += 1) {
      view.rerender(<InlinePropsApp tick={tick} tenant={`org_${tick}`} />);
      await flush();
    }

    const before = FakeWebSocket.instances.length;
    for (const ws of openSockets()) {
      ws.drop();
    }
    await flush(200);

    const reconnects = FakeWebSocket.instances.slice(before);
    expect(reconnects.map((ws) => ws.token)).toEqual([`token-${RERENDERS + 1}`]);
    expect(openSockets()).toHaveLength(1);
  });

  it('reuses one session when inline subscriber data holds an equal Date', async () => {
    const DateApp = ({ tick }: { tick: number }) => (
      <div data-tick={tick}>
        <Inbox
          applicationIdentifier="app"
          subscriber={{ subscriberId: 'user_1', data: { signedUpAt: new Date('2026-01-01T00:00:00Z') } }}
        />
      </div>
    );

    const view = render(<DateApp tick={0} />);
    await flush();

    for (let tick = 1; tick <= RERENDERS; tick += 1) {
      view.rerender(<DateApp tick={tick} />);
      await flush();
    }

    expect(sessionCount).toBe(1);
    expect(openSockets()).toHaveLength(1);
  });
});

describe('useCounts realtime subscription', () => {
  const Counts = () => {
    useCounts({ filters: [{ read: false }] });

    return null;
  };

  const ProviderApp = ({ tenant }: { tenant: string }) => (
    <NovuProvider applicationIdentifier="app" subscriberId="user_1" context={{ tenant: { id: tenant } }}>
      <Counts />
    </NovuProvider>
  );

  it('moves to the new instance socket when the context changes', async () => {
    const view = render(<ProviderApp tenant="org_1" />);
    await flush();
    expect(openSockets().map((ws) => ws.token)).toEqual(['token-1']);

    view.rerender(<ProviderApp tenant="org_2" />);
    await flush();

    expect(openSockets().map((ws) => ws.token)).toEqual(['token-2']);
  });
});
