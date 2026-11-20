import React, { useMemo } from 'react';
import { useNovu } from '../../hooks/NovuProvider';
import { NovuUI, NovuUIOptions } from '../NovuUI';
import { DefaultSlackLinkUser, DefaultSlackLinkUserProps } from './DefaultSlackLinkUser';

export type SlackLinkUserProps = DefaultSlackLinkUserProps & Pick<NovuUIOptions, 'container' | 'appearance'>;

const SlackLinkUserInternal = (props: SlackLinkUserProps) => {
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
      <DefaultSlackLinkUser {...defaultProps} />
    </NovuUI>
  );
};

SlackLinkUserInternal.displayName = 'SlackLinkUserInternal';

export const SlackLinkUser = React.memo((props: SlackLinkUserProps) => {
  return <SlackLinkUserInternal {...props} />;
});

SlackLinkUser.displayName = 'SlackLinkUser';
