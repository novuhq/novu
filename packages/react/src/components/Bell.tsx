import React from 'react';
import { useRenderer } from '../context/RenderContext';
import { Mounter } from './Mounter';
import { BellRenderer } from '../utils/types';

export type BellProps = {
  renderBell?: BellRenderer;
};

export const Bell = React.memo((props: BellProps) => {
  const { renderBell } = props;
  const { novuUI, mountElement } = useRenderer();

  const mount = React.useCallback(
    (element: HTMLElement) => {
      return novuUI.mountComponent({
        name: 'Bell',
        element,
        props: renderBell ? { renderBell: (el, unreadCount) => mountElement(el, renderBell(unreadCount)) } : undefined,
      });
    },
    [renderBell]
  );

  return <Mounter mount={mount} />;
});
