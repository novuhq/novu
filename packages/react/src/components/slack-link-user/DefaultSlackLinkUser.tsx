import { SlackLinkUserProps } from '@novu/js/ui';
import { useCallback } from 'react';
import { useNovuUI } from '../../context/NovuUIContext';
import { Mounter } from '../Mounter';

export type DefaultSlackLinkUserProps = Pick<
  SlackLinkUserProps,
  | 'integrationIdentifier'
  | 'connectionIdentifier'
  | 'context'
  | 'onLinkSuccess'
  | 'onLinkError'
  | 'onUnlinkSuccess'
  | 'onUnlinkError'
  | 'linkLabel'
  | 'unlinkLabel'
>;

export const DefaultSlackLinkUser = (props: DefaultSlackLinkUserProps) => {
  const {
    integrationIdentifier,
    connectionIdentifier,
    context,
    onLinkSuccess,
    onLinkError,
    onUnlinkSuccess,
    onUnlinkError,
    linkLabel,
    unlinkLabel,
  } = props;
  const { novuUI } = useNovuUI();

  const mount = useCallback(
    (element: HTMLElement) => {
      return novuUI.mountComponent({
        name: 'SlackLinkUser',
        props: {
          integrationIdentifier,
          connectionIdentifier,
          context,
          onLinkSuccess,
          onLinkError,
          onUnlinkSuccess,
          onUnlinkError,
          linkLabel,
          unlinkLabel,
        },
        element,
      });
    },
    [
      novuUI,
      integrationIdentifier,
      connectionIdentifier,
      context,
      onLinkSuccess,
      onLinkError,
      onUnlinkSuccess,
      onUnlinkError,
      linkLabel,
      unlinkLabel,
    ]
  );

  return <Mounter mount={mount} />;
};
