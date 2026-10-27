/**
 * Agent Inbox events, sent to Novu's Mixpanel project. Each name ends in `[Agent Inbox]`, so they are easy to
 * tell apart from Novu's own events. Every event belongs to the person who owns the agent, even when the agent
 * did the action: the hidden Novu user behind their Agent Inbox account, whom the dashboard identifies too.
 *
 * Sign-up: Signed Up → Inbox Created → Channel Connected
 * Invites: Contact Invited → Invite Accepted
 * Activity: Message Sent, Inbox Listed, Inbox Item Read
 */
export const AGENT_INBOX_EVENTS = {
  SIGNED_UP: 'Signed Up - [Agent Inbox]',
  INBOX_CREATED: 'Inbox Created - [Agent Inbox]',
  CHANNEL_CONNECTED: 'Channel Connected - [Agent Inbox]',
  CONTACT_INVITED: 'Contact Invited - [Agent Inbox]',
  INVITE_ACCEPTED: 'Invite Accepted - [Agent Inbox]',
  MESSAGE_SENT: 'Message Sent - [Agent Inbox]',
  INBOX_LISTED: 'Inbox Listed - [Agent Inbox]',
  INBOX_ITEM_READ: 'Inbox Item Read - [Agent Inbox]',
} as const;
