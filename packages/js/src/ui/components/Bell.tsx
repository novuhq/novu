import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { useNovu } from '../context';
import { BellIcon } from '../icons';

export function Bell() {
  const novu = useNovu();

  const [unreadCount, setUnreadCount] = createSignal(0);

  onMount(() => {
    novu.on('notifications.unread_count_changed', (data) => {
      setUnreadCount(data.result);
    });
  });

  onCleanup(() => {
    novu.off('notifications.unread_count_changed', () => {});
  });

  return (
    <div class="nt-h-6 nt-w-6 nt-flex nt-justify-center nt-items-center nt-rounded-md">
      <BellIcon />
      {unreadCount()}
    </div>
  );
}
