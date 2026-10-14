import { randomBytes } from 'node:crypto';
import pc from 'picocolors';
import { type AgentPictureFile, loadPicture } from '../../agent-picture';
import type { HumanApiClient } from '../../api/client';
import { type SetupHumanRelayResult, setHumanAgentPicture, setupHumanRelay } from '../../api/human';
import { info, promptLine } from '../../cli-io';
import { DEFAULT_RELAY_AGENT_IDENTIFIER, type HumanCliConfig } from '../../config';
import { splitName } from '../invite';
import { parseEmailAddress } from '../link-channel';

/** What the API calls a relay agent until you name it. */
const DEFAULT_AGENT_NAME = 'Human';

/**
 * The operator's name is what invitees see ("Nikita Grossman wants to reach
 * you via Human"). `--name` always wins. Otherwise ask for first and last
 * name once — only on the very first setup (no subscriberId in config yet)
 * and only on a TTY; an empty first name or a non-interactive run leaves the
 * name unset and invitees see "Someone" until `human setup --name` is run.
 */
export async function resolveOperatorName(
  options: Pick<SetupOptions, 'name'>,
  alreadySetUp: boolean,
  io: { isTTY: boolean; prompt: (question: string) => Promise<string> } = {
    isTTY: Boolean(process.stdin.isTTY),
    prompt: promptLine,
  }
): Promise<{ firstName: string; lastName?: string } | undefined> {
  if (options.name !== undefined) {
    return splitName(options.name);
  }

  if (alreadySetUp || !io.isTTY) {
    return undefined;
  }

  info('People your agents contact will see your name on invites and verification emails.');
  const firstName = (await io.prompt('Your first name: ')).trim();

  if (!firstName) {
    info('No name set — invitees will see "Someone". Set it later with: human setup --name "First Last"');

    return undefined;
  }

  const lastName = (await io.prompt('Your last name (optional): ')).trim();

  return lastName ? { firstName, lastName } : { firstName };
}

/**
 * Asked of everyone, right after the name. Required for a keyless setup — that
 * address is how the inbox recognizes the owner. Optional for an account, where
 * it only prefills the verification step.
 */
export async function resolveOperatorEmail(
  options: Pick<SetupOptions, 'email'>,
  keyless: boolean,
  io: { isTTY: boolean; prompt: (question: string) => Promise<string> } = {
    isTTY: Boolean(process.stdin.isTTY),
    prompt: promptLine,
  }
): Promise<string | undefined> {
  if (options.email !== undefined) {
    const parsed = parseEmailAddress(options.email);
    if (!parsed) {
      throw new Error('Pass a valid address with --email.');
    }

    return parsed;
  }

  if (!io.isTTY) {
    if (keyless) {
      throw new Error('Pass --email <address> when running `human setup` without an account and without a prompt.');
    }

    return undefined;
  }

  const question = keyless
    ? 'Your email address (we only reply to mail from this address): '
    : 'Your email address (optional, prefills verification): ';

  for (let attempt = 0; attempt < 5; attempt++) {
    const raw = (await io.prompt(question)).trim();
    if (!raw) {
      if (!keyless) {
        return undefined;
      }

      process.stdout.write(`${pc.yellow('An email address is required for a setup without an account.')}\n`);
      continue;
    }

    const parsed = parseEmailAddress(raw);
    if (parsed) {
      return parsed;
    }

    process.stdout.write(`${pc.yellow('That does not look like an email address.')}\n`);
  }

  throw new Error(
    keyless
      ? 'No valid email address provided. Re-run `human setup` or pass --email.'
      : 'No valid email address provided. Re-run or pass --email.'
  );
}

/** The agent's name and description, when `--agent-name` or `--agent-description` was passed. */
export function agentIdentityOf(options: Pick<SetupOptions, 'agentName' | 'agentDescription'>): {
  agentName?: string;
  agentDescription?: string;
} {
  return {
    ...(options.agentName !== undefined ? { agentName: options.agentName } : {}),
    ...(options.agentDescription !== undefined ? { agentDescription: options.agentDescription } : {}),
  };
}

export async function readPictureOption(
  options: Pick<SetupOptions, 'agentPicture'>
): Promise<AgentPictureFile | undefined> {
  return options.agentPicture === undefined ? undefined : loadPicture(options.agentPicture);
}

/** Before a channel is linked, so a bot made in this run starts out with the picture. */
export async function uploadPicture(
  client: HumanApiClient,
  picture: AgentPictureFile | undefined,
  agentIdentifier: string
): Promise<void> {
  if (!picture) {
    return;
  }

  await setHumanAgentPicture(client, picture, agentIdentifier);
  info('Saved your agent’s picture.');
}

/** The bot or app made for a channel is called what the agent is called. Older APIs don't say, so it's the default. */
export function channelNameFor(relay: { agentName?: string }): string {
  return relay.agentName || DEFAULT_AGENT_NAME;
}

export interface SetupOptions {
  apiUrl?: string;
  secretKey?: string;
  telegramBotToken?: string;
  slackConfigToken?: string;
  email?: string;
  /** Your display name; skips the first-run prompt. */
  name?: string;
  agentIdentifier?: string;
  /** What your agent is called, as people see it. */
  agentName?: string;
  /** A line about what your agent does, shown with its name. */
  agentDescription?: string;
  /** A JPEG or PNG for your agent: a file on this computer or a web address. */
  agentPicture?: string;
  /** Tri-state: undefined = ask (TTY) / skip (non-TTY); true/false = explicit `--skill`/`--no-skill`. */
  skill?: boolean;
}

/**
 * `--secret-key` (or NOVU_SECRET_KEY) wins. Otherwise the credentials saved for this API are reused: a
 * `human login` (or an earlier `--secret-key`), or a keyless setup. Null means a new keyless setup is needed.
 */
export function reusableAuth(
  existing: HumanCliConfig | null,
  apiUrl: string,
  secretKey: string | undefined
): HumanCliConfig['auth'] | null {
  if (secretKey) {
    return { mode: 'apiKey', secretKey };
  }

  if (!existing || existing.apiUrl !== apiUrl) {
    return null;
  }

  const { auth } = existing;
  const usable = auth.mode === 'apiKey' ? Boolean(auth.secretKey) : Boolean(auth.keylessIdentifier);

  return usable ? auth : null;
}

/** Everything the rest of setup needs about the relay it just provisioned. */
export interface ProvisionedOperator {
  relay: SetupHumanRelayResult;
  subscriberId: string;
  name: { firstName: string; lastName?: string } | undefined;
  operatorEmail: string | undefined;
  /** The account already knew this operator under a different contact. */
  switchedContact: boolean;
}

export async function provisionOperator(
  client: HumanApiClient,
  existing: HumanCliConfig | null,
  options: SetupOptions,
  picture: AgentPictureFile | undefined
): Promise<ProvisionedOperator> {
  const localSubscriberId = existing?.subscriberId ?? `human_${randomBytes(6).toString('hex')}`;
  const relayIdentifier = options.agentIdentifier ?? existing?.relayAgentIdentifier ?? DEFAULT_RELAY_AGENT_IDENTIFIER;
  const name = await resolveOperatorName(options, Boolean(existing?.subscriberId));
  const operatorEmail = await resolveOperatorEmail(options, client.isKeyless);

  info('Setting up your human relay...');
  const relay = await setupHumanRelay(client, {
    subscriberId: localSubscriberId,
    operator: true,
    agentIdentifier: relayIdentifier,
    ...agentIdentityOf(options),
    ...name,
    ...(operatorEmail ? { email: operatorEmail } : {}),
  });
  await uploadPicture(client, picture, relay.agentIdentifier);
  const subscriberId = relay.subscriberId || localSubscriberId;
  const switchedContact = Boolean(existing?.subscriberId) && subscriberId !== existing?.subscriberId;
  if (switchedContact) {
    info('Your account already has you as a contact, so this computer now uses that one.');
  }

  return { relay, subscriberId, name, operatorEmail, switchedContact };
}
