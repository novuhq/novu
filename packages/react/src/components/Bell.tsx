import React from 'react';
import { useNovuUI } from '../context/NovuUIContext';
import { useRenderer } from '../context/RendererContext';
import { BellRenderer } from '../utils/types';
import { Mounter } from './Mounter';
import { withRenderer } from './Renderer';

export type BellProps = {
  renderBell?: BellRenderer;
};

const _Bell = React.memo((props: BellProps) => {
  const { renderBell } = props;
  const { novuUI } = useNovuUI();
  const { mountElement } = useRenderer();

  const mount = React.useCallback(
    (element: HTMLElement) => {
      return novuUI.mountComponent({
        name: 'Bell',
        element,
        props: renderBell
          ? {
              renderBell: (el, unreadCount) => mountElement(el, renderBell(unreadCount)),
            }
          : undefined,
      });
    },
    [renderBell, mountElement, novuUI]
  );

  return <Mounter mount={mount} />;
});

export const Bell = withRenderer(_Bell);
