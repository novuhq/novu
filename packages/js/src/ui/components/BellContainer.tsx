import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { useNovu } from '../context';
import { BellIcon } from '../icons';

export function BellContainer() {
  const [unreadCount, setUnreadCount] = createSignal(0);

  const novu = useNovu();

  const updateReadCount = (data: { result: number }) => {
    setUnreadCount(data.result);
  };

  onMount(() => {
    novu.on('notifications.unread_count_changed', updateReadCount);
  });

  onCleanup(() => {
    novu.off('notifications.unread_count_changed', updateReadCount);
  });

  return (
    <span>
      <BellIcon />
      <Show when={unreadCount() > 0}>
        <span
          class="nt-absolute nt-top-2 nt-right-2 nt-block nt-w-2 nt-h-2 nt-transform nt-translate-x-1/2
            -nt-translate-y-1/2 nt-bg-primary nt-rounded-full"
        />
      </Show>
    </span>
  );
}
