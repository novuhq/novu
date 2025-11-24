import type { TopicSubscription, WorkflowFilter, WorkflowIdentifierOrId } from '../../../subscriptions';
import { useSubscription } from '../../api/hooks/useSubscription';
import { GroupPreference } from './Subscription';
import { SubscriptionButton } from './SubscriptionButton';

export type SubscriptionButtonWrapperProps = {
  topic: string;
  identifier: string;
  preferences: Array<WorkflowIdentifierOrId | WorkflowFilter | GroupPreference>;
  onClick?: (args: { subscription?: TopicSubscription }) => void;
  onDeleteError?: (error: unknown) => void;
  onDeleteSuccess?: () => void;
  onCreateError?: (error: unknown) => void;
  onCreateSuccess?: ({ subscription }: { subscription: TopicSubscription }) => void;
};

export const SubscriptionButtonWrapper = (props: SubscriptionButtonWrapperProps) => {
  const { subscription, loading, create, remove } = useSubscription({
    topicKey: props.topic,
    identifier: props.identifier,
  });

  const onSubscribeClick = async () => {
    const currentSubscription = subscription();
    props.onClick?.({ subscription: currentSubscription ?? undefined });

    if (currentSubscription) {
      const { error } = await remove({ subscription: currentSubscription });
      if (error) {
        props.onDeleteError?.(error);
        return;
      }
      props.onDeleteSuccess?.();
    } else {
      const { data, error } = await create({
        topicKey: props.topic,
        identifier: props.identifier,
        filters: props.preferences,
      });
      if (data) {
        props.onCreateSuccess?.({ subscription: data });
        return;
      }
      props.onCreateError?.(error);
    }
  };

  return <SubscriptionButton subscription={subscription()} loading={loading()} onClick={onSubscribeClick} />;
};
