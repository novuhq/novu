import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { useAppearance, useNovu } from '../context';
import { cn, useStyle } from '../helpers';
import { BellIcon } from '../icons';

export function Bell() {
  const [unreadCount, setUnreadCount] = createSignal(0);

  const { id } = useAppearance();
  const novu = useNovu();
  const style = useStyle();

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
    <span
      class={style(
        cn(
          id,
          `nt-h-6 nt-w-6 nt-flex nt-justify-center
          nt-items-center nt-rounded-md nt-relative
          hover:nt-bg-foreground-alpha-50
          nt-text-foreground-alpha-600 nt-cursor-pointer`
        ),
        'bellContainer'
      )}
    >
      <BellIcon />
      <Show when={unreadCount() > 0}>
        <span
          class="nt-absolute nt-top-2 nt-right-2 nt-block nt-w-2 nt-h-2 nt-transform nt-translate-x-1/2
            nt--translate-y-1/2 nt-bg-primary nt-rounded-full"
        />
      </Show>
    </span>
  );
}
