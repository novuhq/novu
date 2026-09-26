import { SlackLinkUserProps } from '@novu/js/ui';
import { useMemo } from 'react';
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

  return <Mounter name="SlackLinkUser" props={mountProps} />;
};
