import { Component, Show } from 'solid-js';
import { useUnreadCount } from '../../../context';
import { BellRenderer } from '../../../types';
import { ExternalElementRenderer } from '../../ExternalElementRenderer';
import { BellContainer } from './DefaultBellContainer';

type BellProps = {
  renderBell?: BellRenderer;
};
/* This is also going to be exported as a separate component. Keep it pure. */
export const Bell: Component<BellProps> = (props) => {
  const { unreadCount } = useUnreadCount();

  return (
    <Show when={props.renderBell} fallback={<BellContainer unreadCount={unreadCount()} />}>
      <ExternalElementRenderer render={(el) => (props.renderBell ? props.renderBell(el, unreadCount()) : () => {})} />
    </Show>
  );
};
