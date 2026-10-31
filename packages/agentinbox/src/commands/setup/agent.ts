import pc from 'picocolors';
import {
  checkInboxAddress,
  findRelayAgent,
  type InboxAddressCheck,
  type SetupRelayResult,
  setupRelay,
} from '../../api/agent-inbox';
import { type ApiClient, ApiError } from '../../api/client';
import type { AskNote } from '../../screen/screen';
import type { SetupOptions } from './operator';
import { defaultSetupIo, type SetupIo } from './prompts';

/** As long as the API lets an agent's name be (`AGENT_NAME_MAX_LENGTH` in `@novu/shared`). */
const AGENT_NAME_MAX_LENGTH = 60;

/** The part of an address before the `@` stays short enough to say out loud. */
const HANDLE_MAX_LENGTH = 32;

/** What a handle can be: lowercase letters and digits, with hyphens in between. Matches the API's check. */
const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

const HANDLE_RULES =
  'An address takes letters, digits and hyphens (up to 32 characters, starting and ending with a letter or digit).';

const NAME_QUESTION = "Your agent's name: ";
const ADDRESS_QUESTION = "Your agent's address: ";
const MAX_ATTEMPTS = 5;

/** Said under an answer that has nothing an address can hold, such as a name in Cyrillic. */
const LETTERS_ONLY: AskNote = { text: 'a–z and 0–9 only', tone: 'accent' };

/**
 * The address a name turns into: "Atlas Prime" becomes `atlas-prime`, as in the dashboard's onboarding.
 * Letters, digits and single hyphens only, so it reads the same in an email address, a link and a command.
 */
export function toHandle(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, HANDLE_MAX_LENGTH)
    .replace(/-+$/, '');
}

/**
 * What a new agent is called and where people reach it, which nothing changes afterwards: the name is required,
 * and the address comes from it unless the person picks another. `--agent-name` and `--agent-handle` answer
 * for them. Without a terminal the name has to be passed, and the API works the address out from it.
 * An agent that already exists has both, so nothing is asked. A passed address still goes along: it finishes
 * an agent whose inbox was never made, and the API ignores it for one that has its inbox.
 */
export async function resolveNewAgent(
  client: ApiClient,
  agentIdentifier: string,
  options: Pick<SetupOptions, 'agentName' | 'agentHandle'>,
  operatorEmail: string | undefined,
  io: SetupIo = defaultSetupIo
): Promise<{ agentName?: string; inboxHandle?: string }> {
  if (await findRelayAgent(client, agentIdentifier)) {
    return options.agentHandle === undefined ? {} : { inboxHandle: parseHandle(options.agentHandle) };
  }

  const agentName = await resolveAgentName(options, io);
  const inboxHandle = await resolveAgentHandle(client, agentName, options, operatorEmail, io);

  return { agentName, ...(inboxHandle ? { inboxHandle } : {}) };
}

async function resolveAgentName(options: Pick<SetupOptions, 'agentName'>, io: SetupIo): Promise<string> {
  const passed = options.agentName?.trim();
  if (passed) {
    if (passed.length > AGENT_NAME_MAX_LENGTH) {
      throw new Error(`Give your agent a name of up to ${AGENT_NAME_MAX_LENGTH} characters.`);
    }

    return passed;
  }

  if (!io.isTTY) {
    throw new Error(
      'Pass --agent-name <name> when running `npx @agentinbox/cli setup` without a prompt: a new agent needs a name.'
    );
  }

  io.write('Name your agent. People see the name wherever it writes to them, and its address comes from it.\n');

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const name = (await io.prompt(NAME_QUESTION)).trim();
    if (name && name.length <= AGENT_NAME_MAX_LENGTH) {
      return name;
    }

    io.write(`${pc.yellow(name ? `Keep it to ${AGENT_NAME_MAX_LENGTH} characters.` : 'Your agent needs a name.')}\n`);
  }

  throw new Error('No agent name provided. Re-run `npx @agentinbox/cli setup` or pass --agent-name.');
}

async function resolveAgentHandle(
  client: ApiClient,
  agentName: string,
  options: Pick<SetupOptions, 'agentHandle'>,
  operatorEmail: string | undefined,
  io: SetupIo
): Promise<string | undefined> {
  if (options.agentHandle !== undefined) {
    return parseHandle(options.agentHandle);
  }

  return io.isTTY ? chooseHandle(client, agentName, operatorEmail, io) : undefined;
}

function parseHandle(raw: string): string {
  const handle = raw.trim().toLowerCase();
  if (!HANDLE_PATTERN.test(handle)) {
    throw new Error(HANDLE_RULES);
  }

  return handle;
}

/**
 * Offers the address that comes from the name, or a free one close to it, for the person to keep or change.
 * Whether what they type is free shows as they type. The answer they settle on is checked once more.
 */
async function chooseHandle(
  client: ApiClient,
  agentName: string,
  operatorEmail: string | undefined,
  io: SetupIo
): Promise<string | undefined> {
  const check = (handle?: string) => checkInboxAddress(client, handle, operatorEmail);
  const fromName = toHandle(agentName);
  // Without an answer there is nothing to offer, and setting up has the last word on the address anyway.
  const first = await check(fromName || undefined).catch(() => undefined);
  if (!first) {
    return undefined;
  }

  const suffix = `@${first.domain}`;
  let offered = first.available ? first.handle : (first.suggestion ?? '');

  io.write(`${introduceAddress(first, fromName, offered)}\n`);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const answer = await io.prompt(ADDRESS_QUESTION, {
      initial: offered,
      suffix,
      display: asHandle,
      ...(offered ? { note: isAvailable(offered) } : {}),
      check: async (typed) => {
        const handle = handleOf(typed);

        return HANDLE_PATTERN.test(handle) ? availabilityOf(await check(handle)) : LETTERS_ONLY;
      },
      remember: (typed) => ({
        mark: 'done',
        value: `${ADDRESS_QUESTION.trim()} ${pc.bold(`${handleOf(typed)}${suffix}`)}`,
      }),
    });
    const handle = handleOf(answer);

    if (!HANDLE_PATTERN.test(handle)) {
      io.write(`${pc.yellow(HANDLE_RULES)}\n`);
      offered = '';
      continue;
    }

    const result = await check(handle).catch(() => undefined);
    if (!result || result.available) {
      return handle;
    }

    io.write(`${pc.yellow(`${handle} is taken.`)}\n`);
    offered = result.suggestion ?? '';
  }

  throw new Error('No free address chosen. Re-run `npx @agentinbox/cli setup` or pass --agent-handle.');
}

function introduceAddress(first: InboxAddressCheck, fromName: string, offered: string): string {
  const lasts = "An address can't be changed later.";

  if (!fromName) {
    return `Type an address for your agent: its name has nothing an address can hold. ${lasts}`;
  }

  if (!first.available) {
    return `${fromName} is taken${offered ? ', so this one is close to it' : ''}. ${lasts}`;
  }

  return `This is how people reach your agent. ${lasts} Enter keeps it, or type another.`;
}

/** What was typed as a handle: an address typed in full counts for what comes before the `@`. */
function handleOf(typed: string): string {
  return toHandle(typed.split('@')[0]);
}

/** What is typed into the address, character for character, shown as what an address can hold. */
function asHandle(typed: string): string {
  return typed.toLowerCase().replace(/[^a-z0-9@.-]/g, '-');
}

function isAvailable(handle: string): AskNote {
  return { text: `✓ ${handle} is available`, tone: 'success' };
}

function availabilityOf({ handle, available, suggestion }: InboxAddressCheck): AskNote {
  if (available) {
    return isAvailable(handle);
  }

  return { text: suggestion ? `${handle} is taken. ${suggestion} is free` : `${handle} is taken`, tone: 'accent' };
}

/** Sets up the relay. An address taken since it was checked, or passed with `--agent-handle`, says what is free. */
export async function setUpAgent(
  client: ApiClient,
  input: Parameters<typeof setupRelay>[1]
): Promise<SetupRelayResult> {
  try {
    return await setupRelay(client, input);
  } catch (err) {
    const body = err instanceof ApiError ? (err.body as { code?: unknown; suggestion?: unknown }) : undefined;
    if (body?.code !== 'inbox_address_taken') {
      throw err;
    }

    const suggestion = typeof body.suggestion === 'string' ? `, such as ${body.suggestion}` : '';

    throw new Error(`${input.inboxHandle} is taken. Pick another with --agent-handle${suggestion}.`);
  }
}
