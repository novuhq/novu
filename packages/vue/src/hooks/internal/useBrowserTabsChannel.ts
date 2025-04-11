import { ref, onMounted, onUnmounted } from 'vue';

export function useBrowserTabsChannel<T = unknown>(channelName: string, onMessage: (args: T) => void) {
  const tabsChannel = ref<BroadcastChannel | null>(null);

  const postMessage = (data: T) => {
    tabsChannel.value?.postMessage(data);
  };

  onMounted(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      tabsChannel.value = new BroadcastChannel(channelName);
      const listener = (event: MessageEvent<T>) => {
        onMessage(event.data);
      };
      tabsChannel.value.addEventListener('message', listener);

      onUnmounted(() => {
        tabsChannel.value?.removeEventListener('message', listener);
        tabsChannel.value?.close();
      });
    }
  });

  return { postMessage };
}
