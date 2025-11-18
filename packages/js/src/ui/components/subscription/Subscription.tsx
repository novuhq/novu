import { OffsetOptions, Placement } from '@floating-ui/dom';
import type {
  TopicSubscription,
  WorkflowFilter,
  WorkflowGroupFilter,
  WorkflowIdentifierOrId,
} from '../../../subscriptions';
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

export type GroupPreference = {
  label: string;
} & WorkflowGroupFilter;

export type SubscriptionProps = {
  open?: boolean;
  placement?: Placement;
  placementOffset?: OffsetOptions;
  topic: string;
  identifier: string;
  preferences: Array<WorkflowIdentifierOrId | WorkflowFilter | GroupPreference>;
  renderPreferences?: SubscriptionPreferencesRenderer;
};

export const Subscription = (props: SubscriptionProps) => {
  const style = useStyle();
  const { isOpened, setIsOpened } = useInboxContext();
  const isOpen = () => props?.open ?? isOpened();

  const { subscription, loading, create, remove } = useSubscription({
    topicKey: props.topic,
    identifier: props.identifier,
  });

  const onSubscribeClick = () => {
    const currentSubscription = subscription();
    if (currentSubscription) {
      remove({ subscription: currentSubscription });
    } else {
      create({ topicKey: props.topic, identifier: props.identifier, filters: props.preferences });
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
