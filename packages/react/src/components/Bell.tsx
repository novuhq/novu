import React from 'react';
import { useRenderer } from '../context/RenderContext';
import { Mounter } from './Mounter';

type BellRenderProps = ({ unreadCount }: { unreadCount: number }) => React.ReactNode;

type BellProps = {
  children?: never | BellRenderProps;
};

export const Bell = (props: BellProps) => {
  const { novuUI, mountElement } = useRenderer();

  const mount = React.useCallback((element: HTMLElement) => {
    return novuUI.mountComponent({
      name: 'Bell',
      element,
      props: props.children
        ? { renderBell: (el, { unreadCount }) => mountElement(el, props.children?.({ unreadCount })) }
        : undefined,
    });
  }, []);

  return <Mounter mount={mount} />;
};
