/**
 * The first message an agent may send on WhatsApp outside the 24-hour window: a template the operator submits on
 * their own WhatsApp Business account and Meta approves. One per account; the agent's name fills it at send time.
 */
export const FIRST_MESSAGE_TEMPLATE_PREFIX = 'agentinbox_first_message';
export const FIRST_MESSAGE_LANGUAGE = 'en';
export const AGENT_NAME_VARIABLE = 'agent_name';
export const DEFAULT_FIRST_MESSAGE = `You have a message from {{${AGENT_NAME_VARIABLE}}}. Reply here to view it.`;
/** The one button the template carries. Tapping it opens the window, and the held message follows. */
export const VIEW_MESSAGE_BUTTON = 'View message';
export const FIRST_MESSAGE_MAX_LENGTH = 1024;
/** What Meta's review sees in place of the variable. */
export const AGENT_NAME_EXAMPLE = 'Atlas';

const VARIABLE = /\{\{\s*([^{}]*?)\s*\}\}/g;

/** Why Meta would turn this body down before it gets there, or null when it can go. */
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
    return `The only variable the message can have is {{${AGENT_NAME_VARIABLE}}}.`;
  }

  if (variables.length > 1) {
    return `Use {{${AGENT_NAME_VARIABLE}}} once at most.`;
  }

  if (/\{\{|\}\}/.test(text.replace(VARIABLE, ''))) {
    return `Write the variable as {{${AGENT_NAME_VARIABLE}}}.`;
  }

  if (text.startsWith('{{') || text.endsWith('}}')) {
    return `WhatsApp doesn't allow the message to start or end with {{${AGENT_NAME_VARIABLE}}}. Add some words around it.`;
  }

  if (/\n{3,}/.test(text)) {
    return 'Leave at most one empty line between paragraphs.';
  }

  return null;
}

/** The body with the agent's name in place of the variable, as the person sees it. */
export function fillFirstMessage(body: string, agentName: string): string {
  return body.replace(VARIABLE, agentName);
}

/**
 * The name for a new submission. Meta keeps a name once it has been reviewed, so each new body gets the next one:
 * `agentinbox_first_message`, then `_2`, `_3`.
 */
export function nextFirstMessageName(current: string | undefined): string {
  if (!current) {
    return FIRST_MESSAGE_TEMPLATE_PREFIX;
  }

  const version = /_(\d+)$/.exec(current.slice(FIRST_MESSAGE_TEMPLATE_PREFIX.length));

  return `${FIRST_MESSAGE_TEMPLATE_PREFIX}_${(version ? Number(version[1]) : 1) + 1}`;
}
