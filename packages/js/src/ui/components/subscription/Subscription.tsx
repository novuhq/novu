import { OffsetOptions, Placement } from '@floating-ui/dom';
import type { PreferenceFilter, TopicSubscription, WorkflowIdentifierOrId } from '../../../subscriptions';
import { useSubscription } from '../../api/hooks/useSubscription';
import { useInboxContext } from '../../context';
import { cn } from '../../helpers';
import { useStyle } from '../../helpers/useStyle';
import { SubscriptionAppearanceCallback } from '../../types';
import { SubscriptionButton } from './SubscriptionButton';
import { SubscriptionCog } from './SubscriptionCog';

export type SubscriptionPreferencesRenderer = (
  el: HTMLDivElement,
  subscription?: TopicSubscription,
  loading?: boolean
) => () => void;

export type WorkflowPreference = {
  label?: string;
  workflowId: WorkflowIdentifierOrId;
  enabled?: boolean;
};

export type GroupPreference = {
  label: string;
  filter: {
    workflowIds?: Array<WorkflowIdentifierOrId>;
    tags?: string[];
  };
  enabled?: boolean;
};

export type UIPreference = WorkflowIdentifierOrId | WorkflowPreference | GroupPreference;

export type SubscriptionProps = {
  open?: boolean;
  placement?: Placement;
  placementOffset?: OffsetOptions;
  topicKey: string;
  identifier: string;
  preferences: Array<UIPreference>;
  renderPreferences?: SubscriptionPreferencesRenderer;
};

export const Subscription = (props: SubscriptionProps) => {
  const style = useStyle();
  const { isOpened, setIsOpened } = useInboxContext();
  const isOpen = () => props?.open ?? isOpened();

  const { subscription, loading, create, remove } = useSubscription({
    topicKey: props.topicKey,
    identifier: props.identifier,
  });

  const onSubscribeClick = () => {
    const currentSubscription = subscription();
    if (currentSubscription) {
      remove({ subscription: currentSubscription });
    } else {
      const preferences: Array<PreferenceFilter> = props.preferences.map((preference) => {
        if (typeof preference === 'object' && 'workflowId' in preference) {
          return { workflowId: preference.workflowId, enabled: preference.enabled };
        } else if (typeof preference === 'object' && 'filter' in preference) {
          return { filter: preference.filter, enabled: preference.enabled };
        }
        return preference;
      });
      create({ topicKey: props.topicKey, identifier: props.identifier, preferences: preferences });
    }
  };

  return (
    <div
      class={style({
        key: 'subscriptionContainer',
        className: cn('nt-flex nt-items-center'),
        context: { subscription: subscription() ?? undefined } satisfies Parameters<
          SubscriptionAppearanceCallback['subscriptionContainer']
        >[0],
      })}
    >
      <SubscriptionButton subscription={subscription()} loading={loading()} onClick={onSubscribeClick} />
      <SubscriptionCog
        isOpen={isOpen()}
        onOpenChange={setIsOpened}
        subscription={subscription()}
        loading={loading()}
        placement={props.placement ?? 'bottom-end'}
        placementOffset={props.placementOffset}
        preferences={props.preferences}
        renderPreferences={props.renderPreferences}
        onSubscribeClick={onSubscribeClick}
      />
    </div>
  );
};
