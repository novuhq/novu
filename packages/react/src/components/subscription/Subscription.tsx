import { SubscriptionLocalization } from '@novu/js/ui';
import React, { useMemo } from 'react';
import { useNovu } from '../../hooks/NovuProvider';
import { ReactSubscriptionAppearance } from '../../utils/types';
import { NovuUI, NovuUIOptions } from '../NovuUI';
import { withRenderer } from '../Renderer';
import { DefaultSubscription, DefaultSubscriptionProps } from './DefaultSubscription';

type BaseSubscriptionProps = {
  // TODO: update to subscription localization
  localization?: SubscriptionLocalization;
  appearance?: ReactSubscriptionAppearance;
} & Pick<NovuUIOptions, 'container'>;

type SubscriptionPropsWithChildren = {
  children?: React.ReactNode;
} & Exclude<DefaultSubscriptionProps, 'renderPreferences'> &
  BaseSubscriptionProps;

type SubscriptionPropsWithoutChildren = {
  children?: never;
} & DefaultSubscriptionProps &
  BaseSubscriptionProps;

type SubscriptionProps = SubscriptionPropsWithChildren | SubscriptionPropsWithoutChildren;

const SubscriptionInternal = withRenderer<SubscriptionProps>((props) => {
  const { container, localization, appearance, ...defaultSubscriptionProps } = props;
  const novu = useNovu();

  const options: NovuUIOptions = useMemo(() => {
    return {
      container,
      localization,
      appearance,
      options: novu.options,
    };
  }, [localization, appearance, container, novu.options]);

  if (isSubscriptionPropsWithChildren(props)) {
    return (
      <NovuUI options={options} novu={novu}>
        {props.children}
      </NovuUI>
    );
  }

  return (
    <NovuUI options={options} novu={novu}>
      <DefaultSubscription {...defaultSubscriptionProps} />
    </NovuUI>
  );
});

export const Subscription = React.memo((props: SubscriptionProps) => {
  return <SubscriptionInternal {...props} />;
});

function isSubscriptionPropsWithChildren(props: SubscriptionProps): props is SubscriptionPropsWithChildren {
  return 'children' in props;
}
