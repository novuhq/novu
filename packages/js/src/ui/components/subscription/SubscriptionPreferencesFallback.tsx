import { Show } from 'solid-js';
import { TopicSubscription } from '../../../subscriptions';
import { useLocalization } from '../../context';
import { useStyle } from '../../helpers';
import { SubscriptionAppearanceCallback } from '../../types';
import { EmptyState } from './EmptyState';
import { NotSubscribedState } from './NotSubscribedState';
import { SubscriptionButton } from './SubscriptionButton';

export const SubscriptionPreferencesFallback = (props: {
  subscription?: TopicSubscription;
  loading?: boolean;
  onSubscribeClick: () => void;
}) => {
  const style = useStyle();
  const { t } = useLocalization();

  return (
    <div
      class={style({
        key: 'subscriptionPreferencesFallback',
        className: 'nt-flex nt-flex-col nt-items-center nt-justify-center nt-pt-8 nt-pb-12 nt-gap-6',
        context: { subscription: props.subscription ?? undefined } satisfies Parameters<
          SubscriptionAppearanceCallback['subscriptionPreferencesFallback']
        >[0],
      })}
    >
      <Show when={props.subscription?.preferences.length === 0} fallback={<NotSubscribedState />}>
        <EmptyState />
      </Show>
      <div
        class={style({
          key: 'subscriptionPreferencesFallbackTexts',
          className: 'nt-flex nt-flex-col nt-items-center nt-justify-center nt-gap-1',
          context: { subscription: props.subscription ?? undefined } satisfies Parameters<
            SubscriptionAppearanceCallback['subscriptionPreferencesFallbackTexts']
          >[0],
        })}
      >
        <span
          class={style({
            key: 'subscriptionPreferencesFallbackHeader',
            className: 'nt-text-xs nt-font-medium',
            context: { subscription: props.subscription ?? undefined } satisfies Parameters<
              SubscriptionAppearanceCallback['subscriptionPreferencesFallbackHeader']
            >[0],
          })}
          data-localization={
            props.subscription?.preferences.length === 0
              ? 'subscription.preferences.empty.header'
              : 'subscription.preferences.notSubscribed.header'
          }
        >
          {props.subscription?.preferences.length === 0
            ? t('subscription.preferences.empty.header')
            : t('subscription.preferences.notSubscribed.header')}
        </span>
        <span
          class={style({
            key: 'subscriptionPreferencesFallbackDescription',
            className: 'nt-text-xs nt-font-medium nt-text-foreground-alpha-400',
            context: { subscription: props.subscription ?? undefined } satisfies Parameters<
              SubscriptionAppearanceCallback['subscriptionPreferencesFallbackDescription']
            >[0],
          })}
          data-localization={
            props.subscription?.preferences.length === 0
              ? 'subscription.preferences.empty.description'
              : 'subscription.preferences.notSubscribed.description'
          }
        >
          {props.subscription?.preferences.length === 0
            ? t('subscription.preferences.empty.description')
            : t('subscription.preferences.notSubscribed.description')}
        </span>
      </div>
      <SubscriptionButton subscription={props.subscription} loading={props.loading} onClick={props.onSubscribeClick} />
    </div>
  );
};
