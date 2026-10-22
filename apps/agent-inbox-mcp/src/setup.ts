import { type AgentInboxApi, AgentInboxApiError } from './agent-inbox-api';

/** As long as the API lets an agent's name be (`AGENT_NAME_MAX_LENGTH` in `@novu/shared`). */
export const AGENT_NAME_MAX_LENGTH = 60;

/** What a handle can be: lowercase letters and digits, with single hyphens in between. */
const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InboxSetupInput = {
  agent_name?: string;
  handle?: string;
  email?: string;
};

type AgentInfo = {
  agentId: string;
  agentIdentifier: string;
  name: string;
};

type ChannelLink = {
  integration?: {
    providerId?: string;
    sharedInboundAddress?: string;
  };
};

type ContactInfo = {
  id: string;
  emailVerification?: {
    address?: string;
    status?: 'unverified' | 'pending' | 'verified';
  };
};

type AddressCheck = {
  handle: string;
  available: boolean;
  suggestion?: string;
  domain: string;
};

type SetupStatus = {
  agent: AgentInfo | null;
  inboxAddress: string | null;
  operatorId: string | null;
  ownerEmail: { address: string; status: 'unverified' | 'pending' | 'verified' } | null;
};

/**
 * One idempotent call that reports how far setup got, creates the agent and its mailbox, and sends the
 * confirmation link for the owner's email. Name and handle are ignored once an agent exists, so a chatty
 * AI can never rename one or move its address.
 */
export async function inboxSetup(api: AgentInboxApi, input: InboxSetupInput, suggestedEmail?: string): Promise<string> {
  const wantsCreate = input.agent_name !== undefined || input.handle !== undefined;
  if (wantsCreate && (!input.agent_name?.trim() || !input.handle?.trim())) {
    throw new AgentInboxApiError(
      400,
      'Creating an agent needs both agent_name and handle. Ask the user for a name and an address, then call again.'
    );
  }

  let status = await readSetupStatus(api);
  const notes: string[] = [];

  if (wantsCreate) {
    const ensured = await ensureAgent(api, status, input, suggestedEmail);
    status = ensured.status;
    notes.push(...ensured.notes);
  }

  if (input.email !== undefined) {
    const confirmed = await confirmOwnerEmail(api, status, input.email.trim());
    status = confirmed.status;
    notes.push(...confirmed.notes);
  }

  return [...notes, formatStatus(status, suggestedEmail)].filter(Boolean).join('\n\n');
}

async function ensureAgent(
  api: AgentInboxApi,
  status: SetupStatus,
  input: InboxSetupInput,
  suggestedEmail?: string
): Promise<{ status: SetupStatus; notes: string[] }> {
  if (status.agent) {
    return {
      status,
      notes: [
        `This account already has an agent (${status.agent.name}${status.inboxAddress ? ` at ${status.inboxAddress}` : ''}). The name and handle you passed were ignored.`,
      ],
    };
  }

  return {
    status: await createAgent(
      api,
      input.agent_name?.trim() ?? '',
      input.handle?.trim().toLowerCase() ?? '',
      suggestedEmail
    ),
    notes: [],
  };
}

async function confirmOwnerEmail(
  api: AgentInboxApi,
  status: SetupStatus,
  email: string
): Promise<{ status: SetupStatus; notes: string[] }> {
  if (!EMAIL_PATTERN.test(email)) {
    throw new AgentInboxApiError(400, 'That does not look like an email address. Ask the user for one and try again.');
  }

  if (!status.agent || !status.operatorId) {
    throw new AgentInboxApiError(
      409,
      'There is no agent yet. Ask the user for an agent name and inbox address, call inbox_setup with agent_name and handle, then pass email.'
    );
  }

  if (status.ownerEmail?.status === 'verified' && status.ownerEmail.address.toLowerCase() === email.toLowerCase()) {
    return { status, notes: [`${email} is already confirmed. Agents can email the account owner there.`] };
  }

  const note = await sendConfirmation(api, status.operatorId, email);

  return { status: await readSetupStatus(api), notes: [note] };
}

async function createAgent(
  api: AgentInboxApi,
  agentName: string,
  handle: string,
  suggestedEmail?: string
): Promise<SetupStatus> {
  if (!agentName || agentName.length > AGENT_NAME_MAX_LENGTH) {
    throw new AgentInboxApiError(400, `Give the agent a name of up to ${AGENT_NAME_MAX_LENGTH} characters.`);
  }

  if (!HANDLE_PATTERN.test(handle)) {
    throw new AgentInboxApiError(
      400,
      'An address takes letters, digits and hyphens (up to 32 characters, starting and ending with a letter or digit).'
    );
  }

  const check = await api.get<AddressCheck>('/v1/inbox-address', {
    handle,
    ...(suggestedEmail ? { email: suggestedEmail } : {}),
  });
  if (!check.available) {
    const suggestion = check.suggestion
      ? ` Try "${check.suggestion}" (it becomes ${check.suggestion}@${check.domain}).`
      : '';

    throw new AgentInboxApiError(
      409,
      `${handle} is taken.${suggestion} Ask the user for another address and call inbox_setup again.`,
      'inbox_address_taken',
      check.suggestion
    );
  }

  try {
    await api.post('/v1/setup', {
      operator: true,
      agentName,
      inboxHandle: handle,
      ...(suggestedEmail ? { email: suggestedEmail } : {}),
    });
  } catch (error) {
    if (error instanceof AgentInboxApiError && error.code === 'inbox_address_taken') {
      const suggestion = error.suggestion ? ` Try "${error.suggestion}".` : '';

      throw new AgentInboxApiError(
        409,
        `${handle} is taken.${suggestion} Ask the user for another address and call inbox_setup again.`,
        error.code,
        error.suggestion
      );
    }

    throw error;
  }

  return readSetupStatus(api);
}

async function sendConfirmation(api: AgentInboxApi, operatorId: string, email: string): Promise<string> {
  const sent = await api.post<{ address: string; expiresAt?: string }>('/v1/contacts/verifications', {
    subscriberId: operatorId,
    via: 'email',
    address: email,
  });

  return [
    `A confirmation link was sent to ${sent.address ?? email}.`,
    'Tell the user to open it, then call inbox_setup with no arguments to check whether it is confirmed.',
    'Until then, inbox_send with no to cannot email them by contact id.',
  ].join(' ');
}

async function readSetupStatus(api: AgentInboxApi): Promise<SetupStatus> {
  const agent = await api.get<AgentInfo>('/v1/agent').catch((error: unknown) => {
    if (error instanceof AgentInboxApiError && error.status === 404) {
      return null;
    }

    throw error;
  });

  if (!agent) {
    return { agent: null, inboxAddress: null, operatorId: null, ownerEmail: null };
  }

  const [channels, operator] = await Promise.all([
    api.get<ChannelLink[]>('/v1/channels', { limit: 100 }).catch(() => [] as ChannelLink[]),
    api.get<{ subscriberId?: string }>('/v1/operator').catch(() => null),
  ]);

  const links = Array.isArray(channels) ? channels : [];
  const inboxAddress =
    links.find((link) => link.integration?.providerId === 'agent-email-inbox')?.integration?.sharedInboundAddress ??
    null;
  const operatorId = operator?.subscriberId ?? null;
  const contact = operatorId
    ? await api.get<ContactInfo>(`/v1/contacts/${encodeURIComponent(operatorId)}`).catch(() => null)
    : null;
  const verification = contact?.emailVerification;
  const ownerEmail =
    verification?.address && verification.status
      ? { address: verification.address, status: verification.status }
      : null;

  return { agent, inboxAddress, operatorId, ownerEmail };
}

function formatStatus(status: SetupStatus, suggestedEmail?: string): string {
  if (!status.agent) {
    const suggestion = suggestedEmail
      ? ` Their sign-in email looks like ${suggestedEmail}; confirm it with them before passing it as email.`
      : '';

    return [
      'Agent Inbox is not set up yet.',
      'Ask the user for an agent name and an inbox address (letters, digits and hyphens), then call inbox_setup with agent_name and handle.',
      `After that, pass email so a confirmation link goes out.${suggestion}`,
    ].join(' ');
  }

  const lines = [
    `Agent: ${status.agent.name}`,
    status.inboxAddress
      ? `Inbox: ${status.inboxAddress}`
      : 'Inbox: not provisioned yet. Call inbox_setup again, or open agentinbox.md.',
  ];

  if (!status.ownerEmail) {
    const suggestion = suggestedEmail ? ` Suggested address: ${suggestedEmail} — confirm it with the user.` : '';
    lines.push(`Owner email: not confirmed yet. Pass email to send a confirmation link.${suggestion}`);
  } else if (status.ownerEmail.status === 'verified') {
    lines.push(`Owner email: ${status.ownerEmail.address} (confirmed). You can reach them with inbox_send and no to.`);
  } else if (status.ownerEmail.status === 'pending') {
    lines.push(
      `Owner email: ${status.ownerEmail.address} (waiting for them to open the confirmation link). Call inbox_setup again with no arguments after they do.`
    );
  } else {
    lines.push(`Owner email: ${status.ownerEmail.address} (not confirmed). Pass email to send a confirmation link.`);
  }

  return lines.join('\n');
}
