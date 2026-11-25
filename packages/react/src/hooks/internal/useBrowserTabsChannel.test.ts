import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBrowserTabsChannel } from './useBrowserTabsChannel';

const otherTabs: BroadcastChannel[] = [];

const listenAsOtherTab = (channelName: string) => {
  const received = vi.fn();
  const channel = new BroadcastChannel(channelName);
  channel.addEventListener('message', (event) => received(event.data));
  otherTabs.push(channel);

  return received;
};

const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 20)));

afterEach(() => {
  for (const channel of otherTabs.splice(0)) {
    channel.close();
  }
});

describe('useBrowserTabsChannel', () => {
  it('posts on the current channel after the channel name changes', async () => {
    const tenantA = listenAsOtherTab('nv_test:c=tenant:a');
    const tenantB = listenAsOtherTab('nv_test:c=tenant:b');

    const { result, rerender } = renderHook(
      ({ channelName }) => useBrowserTabsChannel({ channelName, onMessage: () => {} }),
      { initialProps: { channelName: 'nv_test:c=tenant:a' } }
    );

    rerender({ channelName: 'nv_test:c=tenant:b' });
    result.current.postMessage({ unreadCount: 3 });
    await flush();

    expect(tenantB).toHaveBeenCalledWith({ unreadCount: 3 });
    expect(tenantA).not.toHaveBeenCalled();
  });

  it('delivers messages from other tabs to the latest handler', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const sender = new BroadcastChannel('nv_test:handler');
    otherTabs.push(sender);

    const { rerender } = renderHook(
      ({ onMessage }) => useBrowserTabsChannel({ channelName: 'nv_test:handler', onMessage }),
      { initialProps: { onMessage: first } }
    );

    rerender({ onMessage: second });
    sender.postMessage('hello');
    await flush();

    expect(second).toHaveBeenCalledWith('hello');
    expect(first).not.toHaveBeenCalled();
  });
});
