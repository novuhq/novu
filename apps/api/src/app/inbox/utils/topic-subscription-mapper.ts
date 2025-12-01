import { PreferencesEntity, TopicSubscribersEntity } from '@novu/dal';
import { SeverityLevelEnum } from '@novu/shared';
import { RulesLogic } from 'json-logic-js';
import { SubscriptionPreferenceDto } from '../../shared/dtos/subscriptions/create-subscriptions-response.dto';
import { TopicSubscriptionDetailsResponseDto } from '../dtos/get-topic-subscriptions-response.dto';
import { SelectedWorkflowFields } from '../usecases/get-topic-subscriptions/get-topic-subscriptions.usecase';

export function mapTopicSubscriptionToDto(
  subscription: TopicSubscribersEntity,
  preferencesEntities: PreferencesEntity[],
  workflowEntities: SelectedWorkflowFields[]
): TopicSubscriptionDetailsResponseDto {
  const preferences: SubscriptionPreferenceDto[] = preferencesEntities
    .map((pref) => {
      const workflowId = pref._templateId?.toString();
      if (!workflowId) {
        return null;
      }

      const workflow = workflowEntities.find((w) => w._id === workflowId);
      const preferences = pref.preferences;

      return {
        workflow: workflow
          ? {
              id: workflow._id,
              identifier: workflow.triggers?.[0]?.identifier || '',
              name: workflow.name || '',
              critical: workflow.critical || false,
              tags: workflow.tags,
              data: workflow.data,
              severity: workflow.severity || SeverityLevelEnum.NONE,
            }
          : undefined,
        subscriptionId: subscription._id,
        enabled: preferences?.all?.enabled ?? true,
        condition: preferences?.all?.condition as RulesLogic | undefined,
      };
    })
    .filter((pref): pref is NonNullable<typeof pref> => pref !== null);

  return {
    id: subscription._id,
    identifier: subscription.identifier,
    name: subscription.name,
    preferences: preferences.length > 0 ? preferences : undefined,
  };
}
