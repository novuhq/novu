export const SUBSCRIBER_ACCESS_SETTING_LABEL = 'Accept messages from anonymous';

export const SUBSCRIBER_ACCESS_TOOLTIP =
  'When on for managed agents, anonymous senders are auto-created as lightweight subscribers so the agent can reply. When on for custom code agents, anonymous senders are forwarded to the bridge with a null subscriber for your code to decide. When off, only known or already-linked users are accepted; everyone else gets a short denial reply. Abuse mitigation is your responsibility when this is on.';
