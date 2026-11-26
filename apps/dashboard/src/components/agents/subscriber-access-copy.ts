import type { AgentSubscriberAccess } from '@/api/agents';

export const SUBSCRIBER_ACCESS_SETTING_LABEL = 'Accept messages from anonymous';

export const SUBSCRIBER_ACCESS_TOOLTIP =
  'When on for managed agents, anonymous senders are auto-created as lightweight subscribers so the agent can reply. When on for custom code agents, anonymous senders are forwarded to the bridge with a null subscriber for your code to decide. When off, only known or already-linked users are accepted; everyone else gets a short denial reply. Abuse mitigation is your responsibility when this is on.';

export const SUBSCRIBER_ACCESS_MODE_SETTING_LABEL = 'Who can message the agent';

export const SUBSCRIBER_ACCESS_MODES: Record<AgentSubscriberAccess, { label: string; description: string }> = {
  open: {
    label: 'Open',
    description:
      'Anyone. Managed agents create a subscriber for an unknown sender; custom code agents get a null subscriber.',
  },
  restricted: {
    label: 'Restricted',
    description: 'Only known subscribers. Everyone else gets a short denial reply.',
  },
  rule: {
    label: 'Rule',
    description:
      'Only known subscribers who match a rule. To block a few people, use subscriber.email not in a@x.com, b@y.com.',
  },
};
