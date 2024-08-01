import { Mounter } from '@/components/Mounter';
import { useRenderer } from '@/context/RendererContext';
import { InboxNotification } from '@novu/js/dist/types/types';
import type { BaseNovuUIOptions, InboxProps as InternalInboxProps } from '@novu/js/ui';
import { ReactNode, useCallback } from 'react';
import { Renderer } from './Renderer';

type AllInOneInboxProps = {
  tabs?: InternalInboxProps['tabs'];
  renderNotification?: (notification: InboxNotification) => ReactNode;
};
const AllInOneInbox = (props: AllInOneInboxProps) => {
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
      } & AllInOneInboxProps)
    | {
        children: ReactNode;
      }
  );

export const Inbox = (props: InboxProps) => {
  if (props.children) {
    return <Renderer options={props} />;
  }

  const { renderNotification, tabs, ...options } = props as BaseNovuUIOptions & AllInOneInboxProps;
  return (
    <Renderer options={options}>
      <AllInOneInbox renderNotification={renderNotification} tabs={tabs} />
    </Renderer>
  );
};
