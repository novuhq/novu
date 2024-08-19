import { Component, Show } from 'solid-js';
import { useTotalUnreadCount } from '../../../context';
import { BellMounter } from '../../../types';
import { ExternalElementMounter } from '../../ExternalElementMounter';
import { BellContainer } from './DefaultBellContainer';

type BellProps = {
  mountBell?: BellMounter;
};
/* This is also going to be exported as a separate component. Keep it pure. */
export const Bell: Component<BellProps> = (props) => {
  const { totalUnreadCount } = useTotalUnreadCount();

  return (
    <Show when={props.mountBell} fallback={<BellContainer unreadCount={totalUnreadCount()} />}>
      <ExternalElementMounter mount={(el) => props.mountBell!(el, totalUnreadCount())} />
    </Show>
  );
};
