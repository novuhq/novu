import { z } from 'zod';
import { NovuTool } from '../core/novu-tool.js';

export const updatePreferences = NovuTool({
  method: 'update_preferences',
  name: 'Update notification preferences',
  description:
    'Updates the notification channel preferences for a subscriber. If a workflowId is provided, updates preferences for that specific workflow. Otherwise, updates global preferences. Use this when a user wants to opt in or out of specific notification channels.',
  parameters: z.object({
    workflowId: z
      .string()
      .optional()
      .describe('The workflow identifier to update preferences for. If omitted, updates global subscriber preferences.'),
    channels: z
      .object({
        email: z.boolean().optional().describe('Enable or disable email notifications.'),
        sms: z.boolean().optional().describe('Enable or disable SMS notifications.'),
        push: z.boolean().optional().describe('Enable or disable push notifications.'),
        inApp: z.boolean().optional().describe('Enable or disable in-app notifications.'),
        chat: z.boolean().optional().describe('Enable or disable chat notifications.'),
      })
      .optional()
      .describe('Channel-level preferences to update.'),
    subscriberId: z
      .string()
      .optional()
      .describe('The subscriber ID whose preferences to update. Defaults to the configured subscriberId.'),
  }),
  execute: (client, config) => async (params) => {
    const { workflowId, channels, subscriberId } = params as {
      workflowId?: string;
      channels?: {
        email?: boolean;
        sms?: boolean;
        push?: boolean;
        inApp?: boolean;
        chat?: boolean;
      };
      subscriberId?: string;
    };

    const targetSubscriberId = subscriberId ?? config.subscriberId;

    const response = await client.subscribers.preferences.update(
      {
        workflowId,
        channels: channels
          ? {
              email: channels.email,
              sms: channels.sms,
              push: channels.push,
              inApp: channels.inApp,
              chat: channels.chat,
            }
          : undefined,
      },
      targetSubscriberId,
    );

    return response.result;
  },
});
