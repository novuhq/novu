import type { TopicSubscription } from '../../../subscriptions';
import { useSubscription } from '../../api/hooks/useSubscription';
import { extractTags, extractWorkflowIds, UIPreference } from './Subscription';
import { SubscriptionPreferences } from './SubscriptionPreferences';

export type SubscriptionPreferencesWrapperProps = {
  topicKey: string;
  identifier?: string;
  preferences: Array<UIPreference> | undefined;
  onClick?: (args: { subscription?: TopicSubscription }) => void;
  onDeleteError?: (error: unknown) => void;
  onDeleteSuccess?: () => void;
  onCreateError?: (error: unknown) => void;
  onCreateSuccess?: ({ subscription }: { subscription: TopicSubscription }) => void;
};

export const SubscriptionPreferencesWrapper = (props: SubscriptionPreferencesWrapperProps) => {
  const workflowIds = extractWorkflowIds(props.preferences ?? []);
  const tags = extractTags(props.preferences ?? []);
  const { subscription, loading, create, remove } = useSubscription({
    topicKey: props.topicKey,
    identifier: props.identifier,
    workflowIds,
    tags,
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
      const preferences = props.preferences?.map((preference) => {
        if (typeof preference === 'object' && 'workflowId' in preference && preference.workflowId) {
          return { workflowId: preference.workflowId, enabled: preference.enabled };
        } else if (typeof preference === 'object' && 'filter' in preference && preference.filter) {
          return { filter: preference.filter, enabled: preference.enabled };
        }

        return preference;
      });
      const { data, error } = await create({
        topicKey: props.topicKey,
        identifier: props.identifier,
        preferences,
      });
      if (data) {
        props.onCreateSuccess?.({ subscription: data });

        return;
      }
      props.onCreateError?.(error);
    }
  };

  return (
    <SubscriptionPreferences
      preferences={props.preferences}
      subscription={subscription()}
      loading={loading()}
      onSubscribeClick={onSubscribeClick}
    />
  );
};
