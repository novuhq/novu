import type { InboxNotification } from '@novu/js';
import { ReactNode, useCallback } from 'react';
import { useRenderer } from '../context/RenderContext';
import { Renderer } from '../Renderer';

type AIOInboxProps = {
  renderNotification?: (notification: InboxNotification) => ReactNode;
};
const AIOInbox = (props: AIOInboxProps) => {
  const { renderNotification, ...rest } = props;
  const { novuUI, mountElement } = useRenderer();

  const mount = useCallback(
    (element: HTMLElement) => {
      return novuUI.mountComponent({
        name: 'Inbox',
        props: {
          ...rest,
          mountNotification: renderNotification
            ? (element, { notification }) => {
                return mountElement(element, renderNotification(notification));
              }
            : undefined,
        },
        element,
      });
    },
    [renderNotification]
  );

  return <Mounter mount={mount} />;
};

type InboxProps = BaseNovuUIOptions &
  (
    | ({
        children?: never;
      } & AIOInboxProps)
    | {
        children: ReactNode;
      }
  );

export const Inbox = (props: InboxProps) => {
  if (props.children) {
    return <Renderer options={props} />;
  }

  const { renderNotification, ...options } = props as BaseNovuUIOptions & AIOInboxProps;

  return (
    <Renderer options={options}>
      <AIOInbox renderNotification={renderNotification} />
    </Renderer>
  );
};
