import { buildDefaultSubscriptionIdentifier } from '@novu/application-generic';
import { NotificationTemplateEntity, PreferencesEntity, TopicSubscribersEntity } from '@novu/dal';
import { SeverityLevelEnum } from '@novu/shared';
import { RulesLogic } from 'json-logic-js';
import { SubscriptionDetailsResponseDto } from '../../shared/dtos/subscription-details-response.dto';
import { SubscriptionPreferenceDto } from '../../shared/dtos/subscriptions/create-subscriptions-response.dto';

export type SelectedWorkflowFields = Pick<
  NotificationTemplateEntity,
  '_id' | 'triggers' | 'name' | 'critical' | 'tags' | 'data' | 'severity'
>;

type PartialPreferenceEntity = Pick<PreferencesEntity, '_templateId' | 'preferences'>;

export function mapTopicSubscriptionToDto(
  subscription: TopicSubscribersEntity,
  preferencesEntities: Array<PartialPreferenceEntity>,
  workflowEntities: SelectedWorkflowFields[]
): SubscriptionDetailsResponseDto {
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
        subscriptionId:
          subscription.identifier ||
          buildDefaultSubscriptionIdentifier(
            subscription.topicKey,
            subscription.externalSubscriberId,
            subscription.contextKeys
          ),
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
    contextKeys: subscription.contextKeys,
  };
}

/**
 * Strips the context part from an identifier when feature flag is off.
 * This handles the case where the client includes context in identifiers
 * but the server has stored them without context.
 *
 * @example
 * stripContextFromIdentifier('tk_topic:si_sub:ctx_project:a,tenant:b') // 'tk_topic:si_sub'
 * stripContextFromIdentifier('tk_topic:si_sub') // 'tk_topic:si_sub'
 */
export function stripContextFromIdentifier(identifier: string): string {
  const contextIndex = identifier.lastIndexOf(':ctx_');
  if (contextIndex === -1) {
    return identifier;
  }
  return identifier.substring(0, contextIndex);
}

/**
 * MongoDB projection object for SelectedWorkflowFields.
 * This ensures the projection is always aligned with the type definition.
 */
export const SELECTED_WORKFLOW_FIELDS_PROJECTION: Record<keyof SelectedWorkflowFields, 1> = {
  _id: 1,
  triggers: 1,
  name: 1,
  critical: 1,
  tags: 1,
  data: 1,
  severity: 1,
} as const;
