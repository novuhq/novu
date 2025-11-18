import { OffsetOptions, Placement } from '@floating-ui/dom';
import { Show } from 'solid-js';
import { TopicSubscription, WorkflowFilter, WorkflowIdentifierOrId } from '../../../subscriptions';
import { useStyle } from '../../helpers/useStyle';
import { Cogs } from '../../icons';
import { SubscriptionAppearanceCallback } from '../../types';
import { Button, Motion, Popover } from '../primitives';
import { GroupPreference, SubscriptionPreferencesRenderer } from './Subscription';
import { SubscriptionPreferences } from './SubscriptionPreferences';

export const SubscriptionCog = (props: {
  subscription?: TopicSubscription | null;
  loading?: boolean;
  isOpen: boolean;
  placement: Placement;
  placementOffset?: OffsetOptions;
  preferences: Array<WorkflowIdentifierOrId | WorkflowFilter | GroupPreference>;
  onOpenChange?: (isOpen: boolean) => void;
  onSubscribeClick: () => void;
  renderPreferences?: SubscriptionPreferencesRenderer;
}) => {
  const style = useStyle();
  return (
    <Popover.Root
      open={props.isOpen}
      onOpenChange={props.onOpenChange}
      placement={props.placement ?? 'bottom-end'}
      offset={props.placementOffset}
    >
      <Popover.Trigger
        asChild={(triggerProps) => (
          <Motion.span
            initial={{ opacity: 0, x: 20, width: 0, marginLeft: 0 }}
            animate={{
              opacity: props.subscription ? 1 : 0,
              x: props.subscription ? 0 : 20,
              width: props.subscription ? 'auto' : 0,
              marginLeft: props.subscription ? '6px' : 0,
            }}
            transition={{ duration: 0.3, easing: 'ease-out' }}
            class={style({
              key: 'subscription__popoverTriggerContainer',
              className: 'nt-h-6',
              context: { subscription: props.subscription ?? undefined } satisfies Parameters<
                SubscriptionAppearanceCallback['subscription__popoverTriggerContainer']
              >[0],
            })}
          >
            <Button
              class={style({
                key: 'subscription__popoverTrigger',
                className: 'nt-p-1 nt-size-6',
                context: { subscription: props.subscription ?? undefined } satisfies Parameters<
                  SubscriptionAppearanceCallback['subscription__popoverTrigger']
                >[0],
              })}
              variant="secondary"
              {...triggerProps}
              disabled={!props.subscription || props.loading}
            >
              <Cogs
                class={style({
                  key: 'subscriptionTriggerIcon',
                  className: 'nt-text-foreground-alpha-600 nt-size-3.5',
                  context: { subscription: props.subscription ?? undefined } satisfies Parameters<
                    SubscriptionAppearanceCallback['subscriptionTriggerIcon']
                  >[0],
                })}
              />
            </Button>
          </Motion.span>
        )}
      />
      <Show when={props.subscription}>
        {(subscription) => (
          <Popover.Content
            portal
            appearanceKey="subscription__popoverContent"
            size="subscription"
            context={
              {
                subscription: props.subscription ?? undefined,
              } satisfies Parameters<SubscriptionAppearanceCallback['subscription__popoverContent']>[0]
            }
          >
            <SubscriptionPreferences
              preferences={props.preferences}
              renderPreferences={props.renderPreferences}
              subscription={subscription()}
              loading={props.loading}
              onSubscribeClick={props.onSubscribeClick}
            />
          </Popover.Content>
        )}
      </Show>
    </Popover.Root>
  );
};
