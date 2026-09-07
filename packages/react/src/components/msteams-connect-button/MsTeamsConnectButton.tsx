import React, { useMemo } from 'react';
import { useNovu } from '../../hooks/NovuProvider';
import { NovuUI, NovuUIOptions } from '../NovuUI';
import { withRenderer } from '../Renderer';
import { DefaultMsTeamsConnectButton, DefaultMsTeamsConnectButtonProps } from './DefaultMsTeamsConnectButton';

export type MsTeamsConnectButtonProps = DefaultMsTeamsConnectButtonProps &
  Pick<NovuUIOptions, 'container' | 'appearance'>;

const MsTeamsConnectButtonInternal = withRenderer<MsTeamsConnectButtonProps>((props) => {
  const { container, appearance, ...defaultProps } = props;
  const novu = useNovu();

  const options: NovuUIOptions = useMemo(() => {
    return {
      container,
      appearance,
      options: novu.options,
    };
  }, [container, appearance, novu.options]);

  return (
    <NovuUI options={options} novu={novu}>
      <DefaultMsTeamsConnectButton {...defaultProps} />
    </NovuUI>
  );
});

MsTeamsConnectButtonInternal.displayName = 'MsTeamsConnectButtonInternal';

export const MsTeamsConnectButton = React.memo((props: MsTeamsConnectButtonProps) => {
  return <MsTeamsConnectButtonInternal {...props} />;
});

MsTeamsConnectButton.displayName = 'MsTeamsConnectButton';
