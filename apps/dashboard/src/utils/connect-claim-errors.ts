import { NovuApiError } from '@/api/api.client';

const CLAIM_FAILED_MESSAGE = 'Unable to claim this agent. Please try again or reopen the link from your chat.';

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

/** `isTerminal` errors cannot succeed on retry, so the page hides "Try again" for them. */
export type ConnectClaimError = {
  message: string;
  isTerminal: boolean;
};

export function getConnectClaimError(error: unknown): ConnectClaimError {
  const body = error instanceof NovuApiError ? (error.rawError as ConnectClaimErrorBody | undefined) : undefined;
  const code = CONNECT_CLAIM_ERROR_CODES.find((known) => known === body?.code);

  if (!(error instanceof NovuApiError) || !code) {
    return { message: CLAIM_FAILED_MESSAGE, isTerminal: false };
  }

  return describeCode(code, error, body);
}

function describeCode(
  code: ConnectClaimErrorCode,
  error: NovuApiError,
  body: ConnectClaimErrorBody | undefined
): ConnectClaimError {
  switch (code) {
    case 'claim_workflow_exists': {
      const identifiers = Array.isArray(body?.workflowIdentifiers) ? body.workflowIdentifiers.join(', ') : '';
      const named = identifiers ? ` named ${identifiers}` : ' with the same names';

      return {
        message: `Your Development environment already has workflows${named}. Rename or delete them, then reopen this link.`,
        isTerminal: false,
      };
    }
    case 'claim_link_used':
      return { message: 'This link was already used. The setup is in the account that claimed it.', isTerminal: true };
    case 'claim_link_expired':
    case 'keyless_environment_expired':
      return { message: 'This setup expired. Ask your agent to create a new one.', isTerminal: true };
    case 'claim_conflict':
      return { message: 'Part of this setup already exists in your Development environment.', isTerminal: false };
    case 'claim_agent_exists':
    case 'verify_email_before_claim':
      return { message: error.message, isTerminal: false };
    case 'claim_link_invalid':
    case 'claim_into_keyless_org':
      return { message: CLAIM_FAILED_MESSAGE, isTerminal: false };
    default: {
      const exhaustiveCheck: never = code;

      return exhaustiveCheck;
    }
  }
}
