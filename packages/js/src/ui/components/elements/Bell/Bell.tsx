import { Component, Show } from 'solid-js';
import { BellMounter } from '../../../types';
import { useUnreadCount } from '../../../context/UnreadCountContext';
import { ExternalElementMounter } from '../../ExternalElementMounter';
import { BellContainer } from './DefaultBellContainer';

type BellProps = {
  mountBell?: BellMounter;
};
/* This is also going to be exported as a separate component. Keep it pure. */
export const Bell: Component<BellProps> = (props) => {
  const { unreadCount } = useUnreadCount();

  return (
    <Show when={props.mountBell} fallback={<BellContainer unreadCount={unreadCount} />}>
      <ExternalElementMounter mount={(el) => props.mountBell!(el, { unreadCount: unreadCount() })} />
    </Show>
  );
};
