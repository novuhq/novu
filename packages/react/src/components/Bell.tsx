import React from 'react';
import { useRenderer } from '../context/RenderContext';
import { Mounter } from './Mounter';

type BellRenderProps = ({ unreadCount }: { unreadCount: number }) => React.ReactNode;

const BellDefault = () => {
  const { novuUI } = useRenderer();

  const mount = React.useCallback((element: HTMLElement) => {
    return novuUI.mountComponent({
      name: 'Bell',
      element,
    });
  }, []);

  return <Mounter mount={mount} />;
};

type BellProps = {
  children?: never | BellRenderProps;
};

export const Bell = (props: BellProps) => {
  if (props.children) {
    return <BellWithRenderProps>{props.children}</BellWithRenderProps>;
  }

  return <BellDefault />;
};

const BellWithRenderProps = (props: { children: BellRenderProps }) => {
  // TODO: Replace this with actual unread count hook
  const unreadCount = 3;

  return <div>{props.children({ unreadCount })}</div>;
};
