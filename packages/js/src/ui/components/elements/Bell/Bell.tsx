import { Component, Show } from 'solid-js';
import { useTotalUnreadCount } from '../../../context';
import { BellRenderer } from '../../../types';
import { ExternalElementRenderer } from '../../ExternalElementRenderer';
import { BellContainer } from './DefaultBellContainer';

type BellProps = {
  renderBell?: BellRenderer;
};
/* This is also going to be exported as a separate component. Keep it pure. */
export const Bell: Component<BellProps> = (props) => {
  const { totalUnreadCount } = useTotalUnreadCount();

  return (
    <Show when={props.renderBell} fallback={<BellContainer unreadCount={totalUnreadCount()} />}>
      <ExternalElementRenderer render={(el) => props.renderBell!(el, totalUnreadCount())} />
    </Show>
  );
};
