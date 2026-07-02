import React, { useMemo } from 'react';
import { useNovu } from '../../hooks/NovuProvider';
import { NovuUI, NovuUIOptions } from '../NovuUI';
import { withRenderer } from '../Renderer';
import { DefaultMsTeamsLinkUser, DefaultMsTeamsLinkUserProps } from './DefaultMsTeamsLinkUser';

export type MsTeamsLinkUserProps = DefaultMsTeamsLinkUserProps & Pick<NovuUIOptions, 'container' | 'appearance'>;

const MsTeamsLinkUserInternal = withRenderer<MsTeamsLinkUserProps>((props) => {
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
      <DefaultMsTeamsLinkUser {...defaultProps} />
    </NovuUI>
  );
});

MsTeamsLinkUserInternal.displayName = 'MsTeamsLinkUserInternal';

export const MsTeamsLinkUser = React.memo((props: MsTeamsLinkUserProps) => {
  return <MsTeamsLinkUserInternal {...props} />;
});

MsTeamsLinkUser.displayName = 'MsTeamsLinkUser';
