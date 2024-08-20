import { Component, Show, onCleanup, createEffect } from 'solid-js';
import { useTotalUnreadCount } from '../../../context';
import { BellRenderer } from '../../../types';
import { BellContainer } from './DefaultBellContainer';

type BellProps = {
  renderBell?: BellRenderer;
};
/* This is also going to be exported as a separate component. Keep it pure. */
export const Bell: Component<BellProps> = (props) => {
  let ref: HTMLDivElement;
  const { totalUnreadCount } = useTotalUnreadCount();

  createEffect(() => {
    const unmount = props.renderBell?.(ref, totalUnreadCount());

    onCleanup(() => {
      unmount?.();
    });
  });

  return (
    <Show when={props.renderBell} fallback={<BellContainer unreadCount={totalUnreadCount()} />}>
      <div
        ref={(el) => {
          ref = el;
        }}
      />
    </Show>
  );
};
