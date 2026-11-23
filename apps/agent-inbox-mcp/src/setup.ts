import { type AgentInboxApi, AgentInboxApiError } from './agent-inbox-api';

/** As long as the API lets an agent's name be (`AGENT_NAME_MAX_LENGTH` in `@novu/shared`). */
export const AGENT_NAME_MAX_LENGTH = 60;

/** What a handle can be: lowercase letters and digits, with single hyphens in between. */
const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The shapes a new agent's mascot can have, as the API takes them. `orb` is the original, round one. */
export const MASCOT_BODIES = ['orb', 'pebble', 'drop', 'bean', 'peek', 'mochi'] as const;

/** The colours it can have. `ember` is the original orange. */
export const LOOK_COLORS = ['ember', 'marigold', 'coral', 'paprika', 'peach', 'bone'] as const;

export type InboxSetupInput = {
  agent_name?: string;
  handle?: string;
  email?: string;
  /** The look of a new agent's mascot. Only a new agent takes it, and only where the API says one can be picked. */
  shape?: (typeof MASCOT_BODIES)[number];
  color?: (typeof LOOK_COLORS)[number];
};

/** The part of a look a mascot is drawn from, as the user asked for it: a shape, a colour or both. */
type AskedLook = Pick<InboxSetupInput, 'shape' | 'color'>;

export type AgentInfo = {
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
  /** Whether a new agent made by this account can be given a look. Missing from an API from before that. */
  canPickLook?: boolean;
};

type SetupStatus = {
  agent: AgentInfo | null;
  inboxAddress: string | null;
  operatorId: string | null;
  ownerEmail: { address: string; status: 'unverified' | 'pending' | 'verified' } | null;
  /** Before there is an agent: whether the one to be made can be given a look. */
  canPickLook: boolean;
};

/** Said for an agent that exists and a look that was passed: a look is picked once, when the agent is made. */
const LOOK_STAYS = 'An agent keeps the look it was made with, so shape and color were ignored.';

/**
 * One idempotent call that reports how far setup got, creates the agent and its mailbox, and sends the
 * confirmation link for the owner's email. A name is never applied to an agent that already exists, and a
 * handle never moves a mailbox that already exists. A missing mailbox can still be finished with a handle.
 */
export async function inboxSetup(api: AgentInboxApi, input: InboxSetupInput, suggestedEmail?: string): Promise<string> {
  let status = await readSetupStatus(api);
  const notes: string[] = [];
  const wantsFields = input.agent_name !== undefined || input.handle !== undefined || lookOf(input) !== undefined;

  if (!status.agent && wantsFields && (!input.agent_name?.trim() || !input.handle?.trim())) {
    throw new AgentInboxApiError(
      400,
      'Creating an agent needs both agent_name and handle. Ask the user for a name and an address, then call again.'
    );
  }

  if (wantsFields) {
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
  const look = lookOf(input);

  if (!status.agent) {
    return createAgent(
      api,
      { name: input.agent_name?.trim() ?? '', handle: input.handle?.trim().toLowerCase() ?? '', look },
      suggestedEmail
    );
  }

  if (status.inboxAddress) {
    const passedIdentity = input.agent_name !== undefined || input.handle !== undefined;

    return {
      status,
      notes: [
        [
          `This account already has an agent (${status.agent.name} at ${status.inboxAddress}).`,
          ...(passedIdentity ? ['The name and handle you passed were ignored.'] : []),
          ...(look ? [LOOK_STAYS] : []),
        ].join(' '),
      ],
    };
  }

  const finished = await finishMailbox(api, status, input, suggestedEmail);

  return look ? { status: finished.status, notes: [...finished.notes, LOOK_STAYS] } : finished;
}

/** The shape and colour the user asked for, or nothing when they asked for neither. */
function lookOf(input: InboxSetupInput): AskedLook | undefined {
  if (input.shape === undefined && input.color === undefined) {
    return undefined;
  }

  return { ...(input.shape ? { shape: input.shape } : {}), ...(input.color ? { color: input.color } : {}) };
}

/** `Drop · Coral`, as agentinbox.md names a look. */
function nameOf(look: { shape: string; color: string }): string {
  const label = (word: string) => `${word[0].toUpperCase()}${word.slice(1)}`;

  return `${label(look.shape)} · ${label(look.color)}`;
}

/**
 * What to say about the look that was asked for, from the one the API answers the new agent has. The API fills
 * a part that was left out with the original look's, and leaves the whole look out where looks can't be picked.
 */
function lookNote(asked: AskedLook, answered: unknown): string {
  const wanted = { shape: asked.shape ?? MASCOT_BODIES[0], color: asked.color ?? LOOK_COLORS[0] };
  const made = (answered && typeof answered === 'object' ? answered : {}) as { shape?: unknown; color?: unknown };

  if (made.shape === wanted.shape && made.color === wanted.color) {
    return `Its mascot is ${nameOf(wanted)}. Call agent_card to show the user their agent's card.`;
  }

  return 'The shape and color you passed were not taken: a look can’t be picked for this account yet, so the mascot is the original orange one.';
}

/** The agent was saved and the mailbox was not. A handle finishes it; a name is never written onto the agent. */
async function finishMailbox(
  api: AgentInboxApi,
  status: SetupStatus,
  input: InboxSetupInput,
  suggestedEmail?: string
): Promise<{ status: SetupStatus; notes: string[] }> {
  const handle = input.handle?.trim().toLowerCase() ?? '';
  if (!handle) {
    return {
      status,
      notes: [
        `This account already has an agent (${status.agent?.name ?? ''}), but its mailbox was not created. Pass handle to finish it. The name was ignored.`,
      ],
    };
  }

  if (!HANDLE_PATTERN.test(handle)) {
    throw new AgentInboxApiError(
      400,
      'An address takes letters, digits and hyphens (up to 32 characters, starting and ending with a letter or digit).'
    );
  }

  await assertHandleAvailable(api, handle, suggestedEmail);
  await postSetup(api, {
    operator: true,
    inboxHandle: handle,
    ...(suggestedEmail ? { email: suggestedEmail } : {}),
  });

  return { status: await readSetupStatus(api), notes: [] };
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

  if (status.ownerEmail?.status === 'verified') {
    if (status.ownerEmail.address.toLowerCase() === email.toLowerCase()) {
      return { status, notes: [`${email} is already confirmed. Agents can email the account owner there.`] };
    }

    throw new AgentInboxApiError(
      409,
      `${status.ownerEmail.address} is already confirmed. inbox_setup will not replace it. Change the owner's email on agentinbox.md.`
    );
  }

  const note = await sendConfirmation(api, status.operatorId, email);

  return { status: await readSetupStatus(api), notes: [note] };
}

async function createAgent(
  api: AgentInboxApi,
  { name: agentName, handle, look }: { name: string; handle: string; look?: AskedLook },
  suggestedEmail?: string
): Promise<{ status: SetupStatus; notes: string[] }> {
  if (!agentName || agentName.length > AGENT_NAME_MAX_LENGTH) {
    throw new AgentInboxApiError(400, `Give the agent a name of up to ${AGENT_NAME_MAX_LENGTH} characters.`);
  }

  if (!HANDLE_PATTERN.test(handle)) {
    throw new AgentInboxApiError(
      400,
      'An address takes letters, digits and hyphens (up to 32 characters, starting and ending with a letter or digit).'
    );
  }

  await assertHandleAvailable(api, handle, suggestedEmail);
  const created = await postSetup(api, {
    operator: true,
    agentName,
    inboxHandle: handle,
    ...(suggestedEmail ? { email: suggestedEmail } : {}),
    ...(look ? { look } : {}),
  });

  return { status: await readSetupStatus(api), notes: look ? [lookNote(look, created.look)] : [] };
}

async function assertHandleAvailable(api: AgentInboxApi, handle: string, suggestedEmail?: string): Promise<void> {
  const check = await api.get<AddressCheck>('/v1/inbox-address', {
    handle,
    ...(suggestedEmail ? { email: suggestedEmail } : {}),
  });
  if (check.available) {
    return;
  }

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

async function postSetup(
  api: AgentInboxApi,
  body: { operator: true; agentName?: string; inboxHandle: string; email?: string; look?: AskedLook }
): Promise<{ look?: unknown }> {
  try {
    return (await api.post<{ look?: unknown } | undefined>('/v1/setup', body)) ?? {};
  } catch (error) {
    if (error instanceof AgentInboxApiError && error.code === 'inbox_address_taken') {
      const suggestion = error.suggestion ? ` Try "${error.suggestion}".` : '';

      throw new AgentInboxApiError(
        409,
        `${body.inboxHandle} is taken.${suggestion} Ask the user for another address and call inbox_setup again.`,
        error.code,
        error.suggestion
      );
    }

    throw error;
  }
}

async function sendConfirmation(api: AgentInboxApi, operatorId: string, email: string): Promise<string> {
  const sent = await api.post<{ address?: string; replacesVerifiedAddress?: boolean }>('/v1/contacts/verifications', {
    subscriberId: operatorId,
    via: 'email',
    address: email,
  });
  const delivery = sent.replacesVerifiedAddress
    ? 'The address already confirmed still receives email until they open the new link.'
    : 'Until then, inbox_send with no to cannot email them by contact id.';

  return [
    `A confirmation link was sent to ${sent.address ?? email}.`,
    'Tell the user to open it, then call inbox_setup with no arguments to check whether it is confirmed.',
    delivery,
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
    // The address check is what a host asks before it makes an agent, and it says whether a look can be picked.
    // It only decides what to ask the user, so a failed check reads as no.
    const check = await api.get<AddressCheck>('/v1/inbox-address').catch(() => null);

    return {
      agent: null,
      inboxAddress: null,
      operatorId: null,
      ownerEmail: null,
      canPickLook: check?.canPickLook === true,
    };
  }

  const [channels, operator] = await Promise.all([
    readIfMissing(api.get<unknown>('/v1/channels', { limit: 100 }), [] as unknown),
    readIfMissing(api.get<{ subscriberId?: string }>('/v1/operator'), null),
  ]);

  const links = Array.isArray(channels) ? (channels as ChannelLink[]) : [];
  const inboxAddress =
    links.find((link) => link.integration?.providerId === 'agent-email-inbox')?.integration?.sharedInboundAddress ??
    null;
  const operatorId = operator?.subscriberId ?? null;
  const ownerEmail = operatorId ? await readOwnerEmail(api, operatorId) : null;

  return { agent, inboxAddress, operatorId, ownerEmail, canPickLook: false };
}

/**
 * A missing resource is empty data. Anything else (a timeout, a 500) is the caller's problem to see,
 * so a status report does not pretend the inbox or the owner is simply absent.
 */
export async function readIfMissing<T>(request: Promise<T>, fallback: T): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof AgentInboxApiError && error.status === 404) {
      return fallback;
    }

    throw error;
  }
}

/**
 * The single-contact endpoint returns channel rows, and those mask the address. The list endpoint is
 * what returns `emailVerification` with the real address, which is what "already confirmed" has to compare.
 */
async function readOwnerEmail(
  api: AgentInboxApi,
  operatorId: string
): Promise<{ address: string; status: 'unverified' | 'pending' | 'verified' } | null> {
  const page = await readIfMissing(
    api.getRaw<{ data?: ContactInfo[] }>('/v1/contacts', { subscriberId: operatorId, limit: 1 }),
    null
  );
  const verification = page?.data?.find((contact) => contact.id === operatorId)?.emailVerification;
  if (!verification?.address || !verification.status) {
    return null;
  }

  return { address: verification.address, status: verification.status };
}

function formatStatus(status: SetupStatus, suggestedEmail?: string): string {
  if (!status.agent) {
    const suggestion = suggestedEmail
      ? ` Their sign-in email looks like ${suggestedEmail}; confirm it with them before passing it as email.`
      : '';

    return [
      'Agent Inbox is not set up yet.',
      'Ask the user for an agent name and an inbox address (letters, digits and hyphens), then call inbox_setup with agent_name and handle.',
      ...(status.canPickLook
        ? [
            'You can also ask which shape and color its mascot should have and pass shape and color with them. Both are optional, and neither can be changed later.',
          ]
        : []),
      `After that, pass email so a confirmation link goes out.${suggestion}`,
    ].join(' ');
  }

  const lines = [
    `Agent: ${status.agent.name}`,
    status.inboxAddress
      ? `Inbox: ${status.inboxAddress}`
      : 'Inbox: not provisioned yet. Call inbox_setup with handle to finish the mailbox.',
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
