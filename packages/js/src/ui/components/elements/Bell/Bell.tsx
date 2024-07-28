import { Accessor, JSX } from 'solid-js';
import { useUnreadCount } from '../../../context/UnreadCountContext';
import { BellContainer } from './DefaultBellContainer';

type BellProps = {
  //TODO: convert this in a `mountBell` prop like we do for notifications.
  children?: ({ unreadCount }: { unreadCount: Accessor<number> }) => JSX.Element;
};
/* This is also going to be exported as a separate component. Keep it pure. */
export function Bell(props: BellProps) {
  const { unreadCount } = useUnreadCount();

  if (props.children) {
    return props.children({ unreadCount });
  }

  return <BellContainer unreadCount={unreadCount} />;
}
