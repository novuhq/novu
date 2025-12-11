import { createMemo, createSignal, For } from 'solid-js';
import { TopicSubscription } from '../../../subscriptions';
import { SubscriptionPreference } from '../../../subscriptions/subscription-preference';
import { StringLocalizationKey, useLocalization } from '../../context/LocalizationContext';
import { useStyle } from '../../helpers';
import { ArrowDropDown } from '../../icons/ArrowDropDown';
import { NodeTree } from '../../icons/NodeTree';
import { SubscriptionAppearanceCallback } from '../../types';
import { Checkbox } from '../primitives/Checkbox';
import { Collapsible } from '../primitives/Collapsible';
import { IconRendererWrapper } from '../shared/IconRendererWrapper';

export const SubscriptionPreferenceGroupRow = (props: {
  group: { label: string; group: Array<{ label: string; preference: SubscriptionPreference }> };
  subscription: TopicSubscription;
}) => {
  const style = useStyle();
  const { t } = useLocalization();
  const [isOpened, setIsOpened] = createSignal(false);

  const preferences = createMemo(() => props.group.group);

  const groupState = createMemo(() => {
    const enabledCount = preferences().filter((pref) => {
      return pref.preference.enabled;
    }).length;

    if (enabledCount === 0) {
      return { checked: false, indeterminate: false };
    }

    if (enabledCount === preferences().length) {
      return { checked: true, indeterminate: false };
    }

    return { checked: false, indeterminate: true };
  });

  const handleGroupChange = async (checked: boolean) => {
    const updates = props.group.group.map((pref) => ({
      workflowId: pref.preference.workflow.identifier || pref.preference.workflow.id,
      value: checked,
    }));

    await props.subscription.bulkUpdatePreferences(updates);
  };

  const handlePreferenceChange = (preference: SubscriptionPreference) => async (checked: boolean) => {
    await preference.update({ value: checked });
  };

  const getPreferenceChecked = (preference: SubscriptionPreference) => {
    return preference.enabled;
  };

  return (
    <div
      class={style({
        key: 'subscriptionPreferenceGroupContainer',
        className: 'nt-bg-neutral-alpha-25 nt-rounded-lg nt-border nt-border-neutral-alpha-50',
        context: { group: props.group } satisfies Parameters<
          SubscriptionAppearanceCallback['subscriptionPreferenceGroupContainer']
        >[0],
      })}
      data-open={isOpened()}
    >
      <div
        class={style({
          key: 'subscriptionPreferenceGroupHeader',
          className:
            'nt-flex nt-justify-between nt-p-2 nt-flex-nowrap nt-self-stretch nt-cursor-pointer nt-items-center nt-overflow-hidden',
          context: { group: props.group } satisfies Parameters<
            SubscriptionAppearanceCallback['subscriptionPreferenceGroupHeader']
          >[0],
        })}
        onClick={() => {
          setIsOpened((prev) => !prev);
        }}
      >
        <div
          class={style({
            key: 'subscriptionPreferenceGroupLabelContainer',
            className: 'nt-overflow-hidden nt-flex nt-items-center nt-gap-1',
            context: { group: props.group } satisfies Parameters<
              SubscriptionAppearanceCallback['subscriptionPreferenceGroupLabelContainer']
            >[0],
          })}
        >
          <IconRendererWrapper
            iconKey="nodeTree"
            class={style({
              key: 'subscriptionPreferenceGroupLabelIcon',
              className: 'nt-text-foreground-alpha-600 nt-size-3.5',
              context: { group: props.group } satisfies Parameters<
                SubscriptionAppearanceCallback['subscriptionPreferenceGroupLabelIcon']
              >[0],
            })}
            fallback={
              <NodeTree
                class={style({
                  key: 'subscriptionPreferenceGroupLabelIcon',
                  className: 'nt-text-foreground-alpha-600 nt-size-3.5',
                  context: { group: props.group } satisfies Parameters<
                    SubscriptionAppearanceCallback['subscriptionPreferenceGroupLabelIcon']
                  >[0],
                })}
              />
            }
          />
          <span
            class={style({
              key: 'subscriptionPreferenceGroupLabel',
              className: 'nt-text-sm nt-font-semibold nt-truncate nt-text-start nt-mr-2',
              context: { group: props.group } satisfies Parameters<
                SubscriptionAppearanceCallback['subscriptionPreferenceGroupLabel']
              >[0],
            })}
            data-open={isOpened()}
            title={props.group.label}
          >
            {props.group.label}
          </span>
        </div>
        <div
          class={style({
            key: 'subscriptionPreferenceGroupActionsContainer',
            className: 'nt-flex nt-items-center nt-gap-1',
            context: { group: props.group } satisfies Parameters<
              SubscriptionAppearanceCallback['subscriptionPreferenceGroupActionsContainer']
            >[0],
          })}
        >
          <Checkbox
            checked={groupState().checked}
            indeterminate={groupState().indeterminate}
            onChange={handleGroupChange}
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
            }}
          />
          <span
            class={style({
              key: 'subscriptionPreferenceGroupActionsContainerRight__icon',
              className:
                'nt-text-foreground-alpha-600 nt-transition-all nt-duration-200 data-[open=true]:nt-transform data-[open=true]:nt-rotate-180',
              context: { group: props.group } satisfies Parameters<
                SubscriptionAppearanceCallback['subscriptionPreferenceGroupActionsContainerRight__icon']
              >[0],
            })}
            data-open={isOpened()}
          >
            <IconRendererWrapper
              iconKey="arrowDropDown"
              class={style({
                key: 'moreTabs__icon',
                className: 'nt-size-4',
              })}
              fallback={
                <ArrowDropDown
                  class={style({
                    key: 'moreTabs__icon',
                    className: 'nt-size-4',
                  })}
                />
              }
            />
          </span>
        </div>
      </div>
      <Collapsible open={isOpened()}>
        <div
          class={style({
            key: 'subscriptionPreferenceGroupBody',
            className: 'nt-flex nt-p-2 nt-flex-col nt-gap-1 nt-bg-background nt-rounded-b-lg',
            context: { group: props.group } satisfies Parameters<
              SubscriptionAppearanceCallback['subscriptionPreferenceGroupBody']
            >[0],
          })}
        >
          <For each={preferences()}>
            {(el) => (
              <div
                class={style({
                  key: 'subscriptionPreferenceGroupWorkflowRow',
                  className: 'nt-flex nt-items-center nt-justify-between nt-p-2 nt-rounded nt-gap-2',
                  context: { preference: el } satisfies Parameters<
                    SubscriptionAppearanceCallback['subscriptionPreferenceGroupWorkflowRow']
                  >[0],
                })}
              >
                <label
                  for={`subscription-preference-${el.preference.workflow.identifier}`}
                  class={style({
                    key: 'subscriptionPreferenceGroupWorkflowLabel',
                    className: 'nt-text-sm nt-truncate nt-text-start nt-w-full nt-cursor-pointer',
                    context: { preference: el } satisfies Parameters<
                      SubscriptionAppearanceCallback['subscriptionPreferenceGroupWorkflowLabel']
                    >[0],
                  })}
                  data-localization={el.preference.workflow.identifier as StringLocalizationKey}
                  title={el.label ?? t(el.preference.workflow.identifier as StringLocalizationKey)}
                >
                  {el.label ?? t(el.preference.workflow.identifier as StringLocalizationKey)}
                </label>
                <Checkbox
                  id={`subscription-preference-${el.preference.workflow.identifier}`}
                  checked={getPreferenceChecked(el.preference)}
                  onChange={handlePreferenceChange(el.preference)}
                />
              </div>
            )}
          </For>
        </div>
      </Collapsible>
    </div>
  );
};
