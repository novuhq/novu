import { MsTeamsLinkUserProps } from '@novu/js/ui';
import { useCallback } from 'react';
import { useNovuUI } from '../../context/NovuUIContext';
import { Mounter } from '../Mounter';

export type DefaultMsTeamsLinkUserProps = Pick<
  MsTeamsLinkUserProps,
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

export const DefaultMsTeamsLinkUser = (props: DefaultMsTeamsLinkUserProps) => {
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
        name: 'MsTeamsLinkUser',
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
