import { NovuApiError } from '@/api/api.client';

export const CLAIM_FAILED_MESSAGE = 'Unable to claim this agent. Please try again or reopen the link from your chat.';

const CONNECT_CLAIM_ERROR_CODES = [
  'claim_workflow_exists',
  'claim_link_used',
  'claim_link_expired',
  'claim_link_invalid',
  'keyless_environment_expired',
  'claim_conflict',
  'claim_into_keyless_org',
  'claim_agent_exists',
  'verify_email_before_claim',
] as const;

type ConnectClaimErrorCode = (typeof CONNECT_CLAIM_ERROR_CODES)[number];

type ConnectClaimErrorBody = {
  code?: unknown;
  workflowIdentifiers?: unknown;
};

const TERMINAL_CODES: ReadonlySet<ConnectClaimErrorCode> = new Set([
  'claim_link_used',
  'claim_link_expired',
  'keyless_environment_expired',
]);

function getErrorBody(error: unknown): ConnectClaimErrorBody | undefined {
  if (!(error instanceof NovuApiError) || !error.rawError || typeof error.rawError !== 'object') {
    return undefined;
  }

  return error.rawError as ConnectClaimErrorBody;
}

function getErrorCode(error: unknown): ConnectClaimErrorCode | undefined {
  const code = getErrorBody(error)?.code;

  return CONNECT_CLAIM_ERROR_CODES.find((known) => known === code);
}

function getWorkflowIdentifiers(error: unknown): string[] {
  const identifiers = getErrorBody(error)?.workflowIdentifiers;

  if (!Array.isArray(identifiers)) {
    return [];
  }

  return identifiers.filter((identifier): identifier is string => typeof identifier === 'string');
}

function getMessageForCode(code: ConnectClaimErrorCode, error: unknown): string {
  switch (code) {
    case 'claim_workflow_exists': {
      const identifiers = getWorkflowIdentifiers(error);
      const named = identifiers.length ? ` named ${identifiers.join(', ')}` : ' with the same names';

      return `Your Development environment already has workflows${named}. Rename or delete them, then reopen this link.`;
    }
    case 'claim_link_used':
      return 'This link was already used. The setup is in the account that claimed it.';
    case 'claim_link_expired':
    case 'keyless_environment_expired':
      return 'This setup expired. Ask your agent to create a new one.';
    case 'claim_conflict':
      return 'Part of this setup already exists in your Development environment.';
    case 'claim_agent_exists':
    case 'verify_email_before_claim':
      return error instanceof NovuApiError ? error.message : CLAIM_FAILED_MESSAGE;
    case 'claim_link_invalid':
    case 'claim_into_keyless_org':
      return CLAIM_FAILED_MESSAGE;
    default: {
      const exhaustiveCheck: never = code;

      return exhaustiveCheck;
    }
  }
}

export function getConnectClaimErrorMessage(error: unknown): string {
  const code = getErrorCode(error);

  if (!code) {
    return CLAIM_FAILED_MESSAGE;
  }

  return getMessageForCode(code, error);
}

/** Terminal errors cannot succeed on retry, so the page hides "Try again" for them. */
export function isTerminalConnectClaimError(error: unknown): boolean {
  const code = getErrorCode(error);

  return code ? TERMINAL_CODES.has(code) : false;
}
