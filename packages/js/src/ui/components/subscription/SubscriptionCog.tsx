import { OffsetOptions, Placement } from '@floating-ui/dom';
import { createMemo, Show } from 'solid-js';
import { Motion, Presence } from 'solid-motionone';
import { TopicSubscription } from '../../../subscriptions';
import { useStyle } from '../../helpers/useStyle';
import { Cogs } from '../../icons';
import { SubscriptionAppearanceCallback } from '../../types';
import { Button, Popover } from '../primitives';
import { SubscriptionPreferencesRenderer, UIPreference } from './Subscription';
import { SubscriptionPreferences } from './SubscriptionPreferences';

const ANIMATION_CONFIG = {
  initial: { opacity: 0, x: 20, width: 0, marginLeft: 0 },
  animate: { opacity: 1, x: 0, width: 'auto', marginLeft: '6px' },
  exit: { opacity: 0, x: 20, width: 0, marginLeft: 0 },
  transition: { duration: 0.3, easing: [0, 0, 0.2, 1] },
} as const;

export const SubscriptionCog = (props: {
  subscription?: TopicSubscription | null;
  loading?: boolean;
  isOpen: boolean;
  placement: Placement;
  placementOffset?: OffsetOptions;
  preferences: Array<UIPreference> | undefined;
  onOpenChange?: (isOpen: boolean) => void;
  onSubscribeClick: () => void;
  renderPreferences?: SubscriptionPreferencesRenderer;
}) => {
  const style = useStyle();
  const subscription = createMemo(() => props.subscription ?? undefined);
  const preferences = createMemo(() => props.preferences);
  const hasSubscription = createMemo(() => !!subscription());
  const hasPreferences = createMemo(() => {
    const prefs = preferences();

    return prefs !== undefined && prefs.length > 0;
  });

  const containerClass = createMemo(() =>
    style({
      key: 'subscription__popoverTriggerContainer',
      className: 'nt-h-6',
      context: { subscription: subscription() } satisfies Parameters<
        SubscriptionAppearanceCallback['subscription__popoverTriggerContainer']
      >[0],
    })
  );

  const triggerClass = createMemo(() =>
    style({
      key: 'subscription__popoverTrigger',
      className: 'nt-p-1 nt-size-6',
      context: { subscription: subscription() } satisfies Parameters<
        SubscriptionAppearanceCallback['subscription__popoverTrigger']
      >[0],
    })
  );

  const iconClass = createMemo(() =>
    style({
      key: 'subscriptionTriggerIcon',
      className: 'nt-text-foreground-alpha-600 nt-size-3.5',
      context: { subscription: subscription() } satisfies Parameters<
        SubscriptionAppearanceCallback['subscriptionTriggerIcon']
      >[0],
    })
  );

  const renderTrigger = (triggerProps: { ref: (el: HTMLElement) => void; onClick: (e: MouseEvent) => void }) => (
    <Presence exitBeforeEnter>
      <Show when={hasSubscription() && hasPreferences()}>
        <Motion.span
          initial={ANIMATION_CONFIG.initial}
          animate={ANIMATION_CONFIG.animate}
          exit={ANIMATION_CONFIG.exit}
          transition={ANIMATION_CONFIG.transition}
          style={{ opacity: 1, transform: 'translateX(0px)', width: 'auto', 'margin-left': '6px' }}
          class={containerClass()}
        >
          <Button
            class={triggerClass()}
            variant="secondary"
            {...triggerProps}
            disabled={!subscription() || props.loading}
          >
            <Cogs class={iconClass()} />
          </Button>
        </Motion.span>
      </Show>
    </Presence>
  );

  return (
    <Popover.Root
      open={props.isOpen}
      onOpenChange={props.onOpenChange}
      placement={props.placement ?? 'bottom-end'}
      offset={props.placementOffset}
    >
      <Popover.Trigger asChild={renderTrigger} />
      <Show when={subscription()}>
        {(subscription) => (
          <Popover.Content
            portal
            appearanceKey="subscription__popoverContent"
            size="subscription"
            context={
              {
                subscription: subscription(),
              } satisfies Parameters<SubscriptionAppearanceCallback['subscription__popoverContent']>[0]
            }
          >
            <SubscriptionPreferences
              preferences={preferences()}
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
