import { createEffect, createMemo, Index, Show } from 'solid-js';
import { TopicSubscription } from '../../../subscriptions';
import { SubscriptionPreference } from '../../../subscriptions/subscription-preference';
import { setDynamicLocalization } from '../../config/defaultLocalization';
import { useInboxContext, useLocalization } from '../../context';
import { cn, useStyle } from '../../helpers';
import { Info } from '../../icons/Info';
import { SubscriptionAppearanceCallback } from '../../types';
import { ExternalElementRenderer } from '../ExternalElementRenderer';
import { Footer } from '../elements';
import { Tooltip } from '../primitives/Tooltip';
import { IconRenderer } from '../shared/IconRendererWrapper';
import { SubscriptionPreferencesRenderer, UIPreference } from './Subscription';
import { SubscriptionPreferenceGroupRow } from './SubscriptionPreferenceGroupRow';
import { SubscriptionPreferenceRow } from './SubscriptionPreferenceRow';
import { SubscriptionPreferencesFallback } from './SubscriptionPreferencesFallback';

export const SubscriptionPreferences = (props: {
  loading?: boolean;
  subscription?: TopicSubscription | null;
  preferences: Array<UIPreference> | undefined;
  renderPreferences?: SubscriptionPreferencesRenderer;
  onSubscribeClick: () => void;
}) => {
  const style = useStyle();
  const { isDevelopmentMode } = useInboxContext();
  const { t } = useLocalization();

  const groupedPreferences = createMemo(() => {
    const subscriptionPreferences = props.subscription?.preferences ?? [];

    return (
      props.preferences
        ?.map((preferenceFilter) => {
          if (typeof preferenceFilter === 'string') {
            const foundPreference = subscriptionPreferences.find(
              (el) => el.workflow?.id === preferenceFilter || el.workflow?.identifier === preferenceFilter
            );
            if (foundPreference) {
              return { label: foundPreference.workflow.name, preference: foundPreference };
            }
          }

          if (typeof preferenceFilter === 'object' && 'workflowId' in preferenceFilter) {
            const foundPreference = subscriptionPreferences.find(
              (pref) =>
                pref.workflow?.id === preferenceFilter.workflowId ||
                pref.workflow?.identifier === preferenceFilter.workflowId
            );
            if (foundPreference) {
              return { label: preferenceFilter.label ?? foundPreference.workflow.name, preference: foundPreference };
            }
          }

          if (typeof preferenceFilter === 'object' && 'filter' in preferenceFilter) {
            let foundPreferences: Array<{
              label: string;
              preference: SubscriptionPreference;
            }> = [];

            if (typeof preferenceFilter.filter === 'object' && 'workflows' in preferenceFilter.filter) {
              const { workflows } = preferenceFilter.filter;
              foundPreferences = subscriptionPreferences
                .filter((pref) => {
                  return workflows?.some(
                    (workflow) =>
                      workflow.workflowId === pref.workflow?.id || workflow.workflowId === pref.workflow?.identifier
                  );
                })
                .map((pref) => {
                  const workflow = workflows?.find(
                    (workflow) =>
                      workflow.workflowId === pref.workflow?.id || workflow.workflowId === pref.workflow?.identifier
                  );
                  return {
                    label: workflow?.label ?? pref.workflow.name,
                    preference: pref,
                  };
                });
            } else if (
              typeof preferenceFilter.filter === 'object' &&
              ('workflowIds' in preferenceFilter.filter || 'tags' in preferenceFilter.filter)
            ) {
              const { workflowIds, tags } = preferenceFilter.filter;
              foundPreferences = subscriptionPreferences
                .filter((pref) => {
                  return (
                    workflowIds?.includes(pref.workflow?.id ?? '') ||
                    workflowIds?.includes(pref.workflow?.identifier ?? '') ||
                    tags?.some((tag) => pref.workflow?.tags?.includes(tag))
                  );
                })
                .map((pref) => ({ label: pref.workflow.name, preference: pref }));
            }

            return { label: preferenceFilter.label, group: foundPreferences };
          }

          return undefined;
        })
        .filter((el) => el !== undefined) ?? []
    );
  });

  createEffect(() => {
    // Register the names as localizable
    setDynamicLocalization((prev) => ({
      ...prev,
      ...props.subscription?.preferences?.reduce<Record<string, string>>((acc, preference) => {
        if (preference.workflow?.identifier && preference.workflow?.name) {
          acc[preference.workflow.identifier] = preference.workflow.name;
        }

        return acc;
      }, {}),
    }));
  });

  return (
    <div
      class={style({
        key: 'subscriptionPreferencesContainer',
        className: cn(
          'nt-w-full nt-h-full nt-flex nt-flex-col [&_.nv-preferencesContainer]:nt-pb-8 [&_.nv-notificationList]:nt-pb-8 nt-overflow-x-hidden',
          {
            '[&_.nv-preferencesContainer]:nt-pb-12 [&_.nv-notificationList]:nt-pb-12': isDevelopmentMode(),
            '[&_.nv-preferencesContainer]:nt-pb-8 [&_.nv-notificationList]:nt-pb-8': !isDevelopmentMode(),
          }
        ),
        context: { subscription: props.subscription ?? undefined } satisfies Parameters<
          SubscriptionAppearanceCallback['subscriptionPreferencesContainer']
        >[0],
      })}
    >
      <Show
        when={!props.renderPreferences}
        fallback={
          <ExternalElementRenderer
            render={(el) => {
              if (props.renderPreferences) {
                return props.renderPreferences(el, props.subscription ?? undefined, props.loading);
              }

              return () => {};
            }}
          />
        }
      >
        <div
          class={style({
            key: 'subscriptionPreferencesHeaderContainer',
            className: 'nt-px-3 nt-py-2 nt-border-b nt-border-neutral-alpha-100 nt-flex nt-items-center nt-gap-1',
            context: { subscription: props.subscription ?? undefined } satisfies Parameters<
              SubscriptionAppearanceCallback['subscriptionPreferencesHeaderContainer']
            >[0],
          })}
        >
          <p
            class={style({
              key: 'subscriptionPreferencesHeader',
              className: 'nt-text-base nt-font-medium',
              context: { subscription: props.subscription ?? undefined } satisfies Parameters<
                SubscriptionAppearanceCallback['subscriptionPreferencesHeader']
              >[0],
            })}
          >
            {t('subscription.preferences.header')}
          </p>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <IconRenderer
                iconKey="info"
                class={style({
                  key: 'subscriptionPreferencesInfoIcon',
                  className: 'nt-text-foreground-alpha-600 nt-size-3.5',
                  context: { subscription: props.subscription ?? undefined } satisfies Parameters<
                    SubscriptionAppearanceCallback['subscriptionPreferencesInfoIcon']
                  >[0],
                })}
                fallback={Info}
              />
            </Tooltip.Trigger>
            <Tooltip.Content data-localization="subscription.preferences.headerInfo">
              <div class="nt-max-w-56">{t('subscription.preferences.headerInfo')}</div>
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
        <div
          class={style({
            key: 'subscriptionPreferencesContent',
            // the height is set here to ensure that the content is not jumping when the preferences are loaded or when the empty state is shown
            className: 'nt-min-h-[272px]',
            context: { subscription: props.subscription ?? undefined } satisfies Parameters<
              SubscriptionAppearanceCallback['subscriptionPreferencesContent']
            >[0],
          })}
        >
          <Show
            when={
              !props.loading && props.subscription?.preferences?.length && props.subscription?.preferences?.length > 0
            }
            fallback={
              <SubscriptionPreferencesFallback
                subscription={props.subscription ?? undefined}
                loading={props.loading}
                onSubscribeClick={props.onSubscribeClick}
              />
            }
          >
            <div
              class={style({
                key: 'subscriptionPreferencesGroupsContainer',
                className: 'nt-flex nt-flex-col nt-gap-2 nt-p-3 nt-pb-12',
                context: { subscription: props.subscription ?? undefined } satisfies Parameters<
                  SubscriptionAppearanceCallback['subscriptionPreferencesGroupsContainer']
                >[0],
              })}
            >
              <Index each={groupedPreferences()}>
                {(preference) => (
                  <Show
                    when={preference().group}
                    fallback={
                      <SubscriptionPreferenceRow
                        preference={preference() as { label: string; preference: SubscriptionPreference }}
                      />
                    }
                  >
                    <Show when={preference().group?.length}>
                      <SubscriptionPreferenceGroupRow
                        group={
                          preference() as {
                            label: string;
                            group: Array<{ label: string; preference: SubscriptionPreference }>;
                          }
                        }
                        subscription={props.subscription as TopicSubscription}
                      />
                    </Show>
                  </Show>
                )}
              </Index>
            </div>
          </Show>
        </div>
        <Footer name="Subscriptions" />
      </Show>
    </div>
  );
};
