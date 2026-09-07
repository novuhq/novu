import React, { useMemo } from 'react';
import { useNovu } from '../../hooks/NovuProvider';
import { NovuUI, NovuUIOptions } from '../NovuUI';
import { withRenderer } from '../Renderer';
import { DefaultConnectChat, DefaultConnectChatProps } from './DefaultConnectChat';

export type ConnectChatProps = DefaultConnectChatProps & Pick<NovuUIOptions, 'container' | 'appearance'>;

const ConnectChatInternal = withRenderer<ConnectChatProps>((props) => {
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
      <DefaultConnectChat {...defaultProps} />
    </NovuUI>
  );
});

ConnectChatInternal.displayName = 'ConnectChatInternal';

export const ConnectChat = React.memo((props: ConnectChatProps) => {
  return <ConnectChatInternal {...props} />;
});

ConnectChat.displayName = 'ConnectChat';
