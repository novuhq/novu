import { type Events, type SocketEventNames, type EventHandler } from '@novu/js';
import { onMounted, onUnmounted, ref } from 'vue';
import { useNovu } from '../../context/NovuProviderContext';
import { requestLock } from '../../utils/requestLock';
import { useBrowserTabsChannel } from './useBrowserTabsChannel';

export function useWebSocketEvent<E extends SocketEventNames>(event: E, eventHandler: (args: Events[E]) => void) {
  const novu = useNovu();
  const { postMessage } = useBrowserTabsChannel(`nv.${event}`, eventHandler);

  const updateReadCount: EventHandler<Events[E]> = (data) => {
    eventHandler(data);
    postMessage(data);
  };

  const cleanup = ref<(() => void) | null>(null);

  onMounted(() => {
    const resolveLock = requestLock(`nv.${event}`, () => {
      cleanup.value = novu.value.on(event, updateReadCount);
    });

    onUnmounted(() => {
      if (cleanup.value) {
        cleanup.value();
      }
      resolveLock();
    });
  });
}
