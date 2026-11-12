/**
 * The first message an agent sends on WhatsApp when someone's 24-hour window has closed: a template on the
 * operator's own WhatsApp Business account that Meta reviews. The same rules as the API's, so the drawer can say
 * what's wrong before Meta does.
 */
export const AGENT_NAME_VARIABLE = 'agent_name';
export const AGENT_NAME_TOKEN = `{{${AGENT_NAME_VARIABLE}}}`;
export const DEFAULT_FIRST_MESSAGE = `You have a message from ${AGENT_NAME_TOKEN}. Reply here to view it.`;
export const VIEW_MESSAGE_BUTTON = 'View message';
export const FIRST_MESSAGE_MAX_LENGTH = 1024;

/** Where the operator's first message stands with Meta. */
export type FirstMessage = {
  /** PENDING, APPROVED, REJECTED, PAUSED, DISABLED or IN_APPEAL. */
  status: string;
  body: string;
  rejectedReason?: string;
  /** An approved version exists, so agents can write first outside the window. */
  approved: boolean;
  /** The approved text still in use while a newer one is under review. */
  approvedBody?: string;
};

const VARIABLE = /\{\{\s*([^{}]*?)\s*\}\}/g;

/** Why Meta would turn this down, or null when it can go. */
export function firstMessageProblem(body: string): string | null {
  const text = body.trim();
  if (!text) {
    return 'Write the message first.';
  }

  if (text.length > FIRST_MESSAGE_MAX_LENGTH) {
    return `Keep the message to ${FIRST_MESSAGE_MAX_LENGTH} characters.`;
  }

  const variables = [...text.matchAll(VARIABLE)].map((match) => match[1]);
  if (variables.some((name) => name !== AGENT_NAME_VARIABLE)) {
    return `The only variable the message can have is ${AGENT_NAME_TOKEN}.`;
  }

  if (variables.length > 1) {
    return `Use ${AGENT_NAME_TOKEN} once at most.`;
  }

  if (/\{\{|\}\}/.test(text.replace(VARIABLE, ''))) {
    return `Write the variable as ${AGENT_NAME_TOKEN}.`;
  }

  if (text.startsWith('{{') || text.endsWith('}}')) {
    return `WhatsApp doesn’t allow the message to start or end with the agent’s name. Add some words around it.`;
  }

  if (/\n{3,}/.test(text)) {
    return 'Leave at most one empty line between paragraphs.';
  }

  return null;
}

/** The message as the person sees it, with the agent's name in place of the variable. */
export function fillFirstMessage(body: string, agentName: string): string {
  return body.replace(VARIABLE, agentName);
}

/** How the review reads in a badge. */
export function firstMessageBadge(firstMessage: FirstMessage | undefined): {
  label: string;
  variant: 'success' | 'pending' | 'danger';
} | null {
  if (!firstMessage) {
    return null;
  }

  switch (firstMessage.status) {
    case 'APPROVED':
      return { label: 'Approved', variant: 'success' };
    case 'PENDING':
    case 'IN_APPEAL':
      return { label: 'In review', variant: 'pending' };
    case 'REJECTED':
      return { label: 'Rejected', variant: 'danger' };
    case 'PAUSED':
      return { label: 'Paused by Meta', variant: 'danger' };
    case 'DISABLED':
      return { label: 'Turned off by Meta', variant: 'danger' };
    default:
      return { label: firstMessage.status.toLowerCase(), variant: 'pending' };
  }
}
