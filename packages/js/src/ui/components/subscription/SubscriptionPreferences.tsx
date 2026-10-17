import { createEffect, createMemo, Index, Show } from 'solid-js';
import type { TopicSubscription, WorkflowIdentifierOrId } from '../../../subscriptions';
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
import type { GroupPreference, SubscriptionPreferencesRenderer, UIPreference } from './Subscription';
import { SubscriptionPreferenceGroupRow } from './SubscriptionPreferenceGroupRow';
import { SubscriptionPreferenceRow } from './SubscriptionPreferenceRow';
import { SubscriptionPreferencesFallback } from './SubscriptionPreferencesFallback';

type PreferenceEntry = { label: string; preference: SubscriptionPreference };
type PreferenceGroup = { label: string; group: Array<PreferenceEntry> };

const matchesWorkflow = (preference: SubscriptionPreference, workflowId?: WorkflowIdentifierOrId) =>
  preference.workflow?.id === workflowId || preference.workflow?.identifier === workflowId;

const findByWorkflow = (preferences: Array<SubscriptionPreference>, workflowId?: WorkflowIdentifierOrId) =>
  preferences.find((preference) => matchesWorkflow(preference, workflowId));

/** The preferences a group lists one by one, labelled by the group's own entries. */
const collectByWorkflows = (
  preferences: Array<SubscriptionPreference>,
  workflows: NonNullable<GroupPreference['filter']['workflows']>
): Array<PreferenceEntry> =>
  preferences
    .filter((preference) => workflows.some((workflow) => matchesWorkflow(preference, workflow.workflowId)))
    .map((preference) => ({
      label:
        workflows.find((workflow) => matchesWorkflow(preference, workflow.workflowId))?.label ??
        preference.workflow.name,
      preference,
    }));

/** The preferences a group selects by workflow ids or tags, labelled by their workflow names. */
const collectByIdsOrTags = (
  preferences: Array<SubscriptionPreference>,
  filter: Pick<GroupPreference['filter'], 'workflowIds' | 'tags'>
): Array<PreferenceEntry> =>
  preferences
    .filter(
      (preference) =>
        filter.workflowIds?.includes(preference.workflow?.id ?? '') ||
        filter.workflowIds?.includes(preference.workflow?.identifier ?? '') ||
        filter.tags?.some((tag) => preference.workflow?.tags?.includes(tag))
    )
    .map((preference) => ({ label: preference.workflow.name, preference }));

const resolveGroup = (preferences: Array<SubscriptionPreference>, group: GroupPreference): PreferenceGroup => {
  const { filter } = group;
  if (typeof filter !== 'object') {
    return { label: group.label, group: [] };
  }
  if ('workflows' in filter) {
    return { label: group.label, group: collectByWorkflows(preferences, filter.workflows ?? []) };
  }
  if ('workflowIds' in filter || 'tags' in filter) {
    return { label: group.label, group: collectByIdsOrTags(preferences, filter) };
  }

  return { label: group.label, group: [] };
};

const isGroupPreference = (preference: Exclude<UIPreference, string>): preference is GroupPreference =>
  'filter' in preference;

const asGroup = (entry: PreferenceEntry | PreferenceGroup): PreferenceGroup | undefined =>
  'group' in entry ? entry : undefined;

/** Resolves one entry of the `preferences` prop against the subscription; `undefined` when nothing matches it. */
const resolvePreference = (
  preferences: Array<SubscriptionPreference>,
  preferenceFilter: UIPreference
): PreferenceEntry | PreferenceGroup | undefined => {
  if (typeof preferenceFilter === 'string') {
    const found = findByWorkflow(preferences, preferenceFilter);

    return found ? { label: found.workflow.name, preference: found } : undefined;
  }
  if (typeof preferenceFilter === 'object' && 'workflowId' in preferenceFilter) {
    const found = findByWorkflow(preferences, preferenceFilter.workflowId);

    return found ? { label: preferenceFilter.label ?? found.workflow.name, preference: found } : undefined;
  }
  if (typeof preferenceFilter === 'object' && isGroupPreference(preferenceFilter)) {
    return resolveGroup(preferences, preferenceFilter);
  }

  return undefined;
};

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

    return (props.preferences ?? [])
      .map((preferenceFilter) => resolvePreference(subscriptionPreferences, preferenceFilter))
      .filter((entry) => entry !== undefined);
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
          <Show when={props.renderPreferences}>
            {(renderPreferences) => (
              <ExternalElementRenderer
                render={renderPreferences()}
                args={[props.subscription ?? undefined, props.loading]}
              />
            )}
          </Show>
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
                {(entry) => (
                  <Show
                    when={asGroup(entry())}
                    fallback={<SubscriptionPreferenceRow preference={entry() as PreferenceEntry} />}
                  >
                    {(group) => (
                      <Show when={group().group.length > 0}>
                        <SubscriptionPreferenceGroupRow
                          group={group()}
                          subscription={props.subscription as TopicSubscription}
                        />
                      </Show>
                    )}
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
