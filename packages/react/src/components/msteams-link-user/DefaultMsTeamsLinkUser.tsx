import { MsTeamsLinkUserProps } from '@novu/js/ui';
import { useMemo } from 'react';
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

  const mountProps = useMemo(
    () => ({
      integrationIdentifier,
      connectionIdentifier,
      context,
      onLinkSuccess,
      onLinkError,
      onUnlinkSuccess,
      onUnlinkError,
      linkLabel,
      unlinkLabel,
    }),
    [
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

  return <Mounter name="MsTeamsLinkUser" props={mountProps} />;
};
