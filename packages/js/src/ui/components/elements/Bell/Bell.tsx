import { Accessor, JSX } from 'solid-js';
import { BellContainer } from './DefaultBellContainer';
import { useUnreadCount } from '../../../context/UnreadCountContext';

type BellProps = {
  children?: ({ unreadCount }: { unreadCount: Accessor<number> }) => JSX.Element;
};
export function Bell(props: BellProps) {
  const { unreadCount } = useUnreadCount();

  if (props.children) {
    return props.children({ unreadCount });
  }

  return <BellContainer unreadCount={unreadCount} />;
}
