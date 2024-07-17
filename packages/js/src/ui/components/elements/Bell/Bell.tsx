import { createSignal, JSX, onCleanup, onMount } from 'solid-js';
import { requestLock } from '../../../helpers/browser';
import { NV_INBOX_WEBSOCKET_LOCK } from '../../../helpers/constants';
import { useNovu } from '../../../context';
import { BellContainer } from './DefaultBellContainer';
import { useTabsChannel } from '../../../helpers/useTabsChannel';

type BellProps = {
  children?: ({ unreadCount }: { unreadCount: number }) => JSX.Element;
};
export function Bell(props: BellProps) {
  const [unreadCount, setUnreadCount] = createSignal(0);
  const novu = useNovu();
  const { postMessage } = useTabsChannel<number>({ onMessage: setUnreadCount });

  const updateReadCount = (data: { result: number }) => {
    setUnreadCount(data.result);
    postMessage(data.result);
  };

  onMount(() => {
    const resolveLock = requestLock(NV_INBOX_WEBSOCKET_LOCK, () => {
      novu.on('notifications.unread_count_changed', updateReadCount);
    });

    onCleanup(() => {
      novu.off('notifications.unread_count_changed', updateReadCount);
      resolveLock();
    });
  });

  if (props.children) {
    return props.children({ unreadCount: unreadCount() });
  }

  return <BellContainer unreadCount={unreadCount()} />;
}
