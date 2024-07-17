import { createSignal, onCleanup, onMount } from 'solid-js';
import { NV_INBOX_TABS_CHANNEL } from './constants';

export const useTabsChannel = <T = unknown>({ onMessage }: { onMessage: (args: T) => void }) => {
  const [tabsChannel] = createSignal(new BroadcastChannel(NV_INBOX_TABS_CHANNEL));

  const postMessage = (data: T) => {
    const channel = tabsChannel();
    channel.postMessage(data);
  };

  onMount(() => {
    const listener = (event: MessageEvent<T>) => {
      onMessage(event.data);
    };

    const channel = tabsChannel();
    channel.addEventListener('message', listener);

    onCleanup(() => {
      channel.removeEventListener('message', listener);
    });
  });

  return { postMessage };
};
