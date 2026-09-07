import React, { useMemo } from 'react';
import { useNovu } from '../../hooks/NovuProvider';
import { NovuUI, NovuUIOptions } from '../NovuUI';
import { withRenderer } from '../Renderer';
import { DefaultTelegramConnectButton, DefaultTelegramConnectButtonProps } from './DefaultTelegramConnectButton';

export type TelegramConnectButtonProps = DefaultTelegramConnectButtonProps &
  Pick<NovuUIOptions, 'container' | 'appearance'>;

const TelegramConnectButtonInternal = withRenderer<TelegramConnectButtonProps>((props) => {
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
      <DefaultTelegramConnectButton {...defaultProps} />
    </NovuUI>
  );
});

TelegramConnectButtonInternal.displayName = 'TelegramConnectButtonInternal';

export const TelegramConnectButton = React.memo((props: TelegramConnectButtonProps) => {
  return <TelegramConnectButtonInternal {...props} />;
});

TelegramConnectButton.displayName = 'TelegramConnectButton';
