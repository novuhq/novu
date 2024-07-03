import { createSignal, JSX, onCleanup, onMount } from 'solid-js';
import { useNovu } from '../../context';
import { DefaultBellContainer } from './DefaultBellContainer';

type BellProps = {
  children?: ({ unreadCount }: { unreadCount: number }) => JSX.Element;
};
export function Bell(props: BellProps) {
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

  if (props.children) {
    return props.children({ unreadCount: unreadCount() });
  }

  // return <DefaultBellContainer unreadCount={unreadCount()} />;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return props.children({ unreadCount: unreadCount() });
}
