import pc from 'picocolors';
import { type HumanApiClient } from '../api/client';
import { setupHumanRelay } from '../api/human';
import { type AgentIntegrationLink, getSubscriberEmail, hasChannelEndpoint, listAgentIntegrations } from '../api/setup';
import { info, promptLine } from '../cli-io';
import { renderQR } from '../qr';
import { startWaitIndicator } from '../spinner';
import { clientFromConfig, handleError } from './interact';
import {
  findLinkedIntegration,
  generateSlackUserOauthUrl,
  HUMAN_CHANNELS,
  type HumanChannel,
  inferViaFromLinks,
  isHumanChannel,
  issueTelegramSubscriberLinkWithRetry,
  linkedVias,
  parseEmailAddress,
  waitForEndpoint,
} from './link-channel';

export interface InviteOptions {
  via?: string;
  email?: string;
  /** Display name, e.g. "Alice Chen" — split into firstName/lastName on the subscriber. */
  name?: string;
  async?: boolean;
  apiUrl?: string;
}

/**
 * `--name "Alice Chen"` → `{ firstName: 'Alice', lastName: 'Chen' }`; a single
 * token is just a firstName. Returns undefined for blank input so callers can
 * spread it straight into the setup payload without clearing an existing name.
 */
export function splitName(raw: string | undefined): { firstName: string; lastName?: string } | undefined {
  const name = raw?.trim().replace(/\s+/g, ' ');
  if (!name) {
    return undefined;
  }

  const spaceAt = name.indexOf(' ');
  if (spaceAt === -1) {
    return { firstName: name };
  }

  return { firstName: name.slice(0, spaceAt), lastName: name.slice(spaceAt + 1) };
}

export interface InviteResult {
  humanId: string;
  via: HumanChannel;
  alreadyLinked: boolean;
  url?: string;
}

export function parseInviteHumanId(raw: string): string {
  const id = raw.trim();
  if (!id) {
    throw new Error('Pass the subscriberId to invite, e.g. `human invite alice --via slack`.');
  }

  if (id.includes(',')) {
    throw new Error('Invite one human at a time. Repeat `human invite` for each person.');
  }

  return id;
}

export function resolveInviteVia(links: AgentIntegrationLink[], viaFlag?: string): HumanChannel {
  if (viaFlag) {
    const normalized = viaFlag.toLowerCase();
    if (!isHumanChannel(normalized)) {
      throw new Error(`Unknown channel "${viaFlag}". Use one of: ${HUMAN_CHANNELS.join(', ')}.`);
    }

    return normalized;
  }

  const inferred = inferViaFromLinks(links);
  if (inferred) {
    return inferred;
  }

  const available = linkedVias(links);
  if (available.length === 0) {
    throw new Error('No channel is linked to the relay agent. Run `human setup` first.');
  }

  throw new Error(`Relay is linked on multiple channels (${available.join(', ')}). Pass --via to pick one.`);
}

export async function runInvite(humanIdArg: string, options: InviteOptions): Promise<InviteResult> {
  const humanId = parseInviteHumanId(humanIdArg);
  const { client, config } = clientFromConfig(options.apiUrl);
  const agentIdentifier = config.relayAgentIdentifier;
  const links = await listAgentIntegrations(client, agentIdentifier);
  const via = resolveInviteVia(links, options.via);
  const linked = findLinkedIntegration(links, via);
  const name = splitName(options.name);

  if (!linked) {
    throw new Error(`No ${via} channel is linked to the relay agent. Run \`human setup ${via}\` first.`);
  }

  let result: InviteResult;
  switch (via) {
    case 'email':
      result = await inviteEmail(client, humanId, agentIdentifier, linked.integration.sharedInboundAddress, options);
      break;
    case 'telegram':
      await setupHumanRelay(client, { subscriberId: humanId, agentIdentifier, ...name });
      result = await inviteTelegram(client, humanId, linked.integration.identifier, options);
      break;
    case 'slack':
      await setupHumanRelay(client, { subscriberId: humanId, agentIdentifier, ...name });
      result = await inviteSlack(client, humanId, agentIdentifier, linked.integration.identifier, options);
      break;
    default: {
      const exhaustive: never = via;
      throw new Error(`Unhandled channel: ${exhaustive}`);
    }
  }

  return result;
}

export async function inviteCommand(humanIdArg: string, options: InviteOptions): Promise<never> {
  try {
    const result = await runInvite(humanIdArg, options);
    const who = options.name?.trim() ? `${result.humanId} (${options.name.trim()})` : result.humanId;
    const lead =
      options.async && !result.alreadyLinked && result.via !== 'email'
        ? 'Link issued. After they connect, address them with:'
        : `${who} is ${result.alreadyLinked ? 'already ' : ''}linked on ${result.via}. Address them with:`;

    process.stdout.write(`\n${pc.green('✔')} ${lead}\n` + `  ${pc.bold(`human ask "…" --to ${result.humanId}`)}\n`);

    process.exit(0);
  } catch (err) {
    handleError(err);
  }
}

async function inviteTelegram(
  client: HumanApiClient,
  humanId: string,
  integrationIdentifier: string,
  options: InviteOptions
): Promise<InviteResult> {
  if (await hasChannelEndpoint(client, integrationIdentifier, humanId)) {
    info(`${humanId} is already linked on telegram.`);

    return { humanId, via: 'telegram', alreadyLinked: true };
  }

  let subscriberLink: { deepLinkUrl: string; botUsername: string };
  try {
    subscriberLink = await issueTelegramSubscriberLinkWithRetry(client, integrationIdentifier, humanId);
  } catch (err) {
    throw wrapBotTokenError(err);
  }

  printInviteUrl(
    humanId,
    'telegram',
    subscriberLink.deepLinkUrl,
    `Scan this QR (or open the link) and tap ${pc.bold('Start')} in Telegram` +
      (subscriberLink.botUsername ? ` (@${subscriberLink.botUsername})` : '')
  );
  process.stdout.write(`\n${renderQR(subscriberLink.deepLinkUrl)}\n`);

  if (!options.async) {
    await waitForInvitee(client, integrationIdentifier, humanId, 'telegram', subscriberLink.botUsername);
  }

  return { humanId, via: 'telegram', alreadyLinked: false, url: subscriberLink.deepLinkUrl };
}

async function inviteSlack(
  client: HumanApiClient,
  humanId: string,
  agentIdentifier: string,
  integrationIdentifier: string,
  options: InviteOptions
): Promise<InviteResult> {
  if (await hasChannelEndpoint(client, integrationIdentifier, humanId)) {
    info(`${humanId} is already linked on slack.`);

    return { humanId, via: 'slack', alreadyLinked: true };
  }

  const authorizeUrl = await generateSlackUserOauthUrl(client, {
    integrationIdentifier,
    agentIdentifier,
    subscriberId: humanId,
  });

  printInviteUrl(humanId, 'slack', authorizeUrl, 'Open this Slack authorize URL and approve the app');

  if (!options.async) {
    await waitForInvitee(client, integrationIdentifier, humanId, 'slack');
  }

  return { humanId, via: 'slack', alreadyLinked: false, url: authorizeUrl };
}

async function inviteEmail(
  client: HumanApiClient,
  humanId: string,
  agentIdentifier: string,
  inboundAddress: string | undefined,
  options: InviteOptions
): Promise<InviteResult> {
  const existingEmail = await getSubscriberEmail(client, humanId);
  if (existingEmail && !options.email) {
    info(`${humanId} is already linked on email (${existingEmail}).`);

    // Still honor a name passed alongside so `invite --name` is a way to label
    // someone who was linked before names existed.
    const name = splitName(options.name);
    if (name) {
      await setupHumanRelay(client, { subscriberId: humanId, agentIdentifier, ...name });
    }

    return { humanId, via: 'email', alreadyLinked: true };
  }

  const email = options.email ? requireEmail(options.email) : await promptInviteEmail();

  await setupHumanRelay(client, { subscriberId: humanId, agentIdentifier, email, ...splitName(options.name) });

  if (inboundAddress) {
    info(`Replies go to ${pc.bold(inboundAddress)} — answering an interaction is just replying to its email.`);
  }

  return { humanId, via: 'email', alreadyLinked: false };
}

async function waitForInvitee(
  client: HumanApiClient,
  integrationIdentifier: string,
  humanId: string,
  via: 'telegram' | 'slack',
  botUsername?: string
): Promise<void> {
  const waitingFor =
    via === 'telegram'
      ? `${humanId}'s /start${botUsername ? ` on @${botUsername}` : ''} in Telegram`
      : `${humanId} to finish Slack authorize`;
  const stopIndicator = startWaitIndicator(
    `Waiting for ${humanId} to connect ${via}`,
    `Ctrl-C detaches; resume with: human invite ${humanId} --via ${via}`
  );

  try {
    await waitForEndpoint(
      client,
      integrationIdentifier,
      humanId,
      waitingFor,
      `Re-run \`human invite ${humanId} --via ${via}\` to continue.`
    );
  } finally {
    stopIndicator();
  }
}

function printInviteUrl(humanId: string, via: HumanChannel, url: string, instruction: string): void {
  process.stdout.write(
    `\nSend this ${via} link to ${pc.bold(humanId)} — ${instruction}:\n\n  ${pc.underline(url)}\n\n`
  );
}

function requireEmail(value: string): string {
  const email = parseEmailAddress(value);
  if (!email) {
    throw new Error('Pass a valid --email <address> when inviting on email.');
  }

  return email;
}

async function promptInviteEmail(): Promise<string> {
  if (!process.stdin.isTTY) {
    throw new Error('Pass --email <address> when running `human invite --via email` non-interactively.');
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const email = parseEmailAddress(await promptLine('Their email address: '));
    if (email) {
      return email;
    }

    process.stdout.write(`${pc.yellow('That does not look like an email address.')}\n`);
  }

  throw new Error('No valid email address provided. Re-run with --email <address>.');
}

function wrapBotTokenError(err: unknown): Error {
  if (err instanceof Error && /bot token is missing/i.test(err.message)) {
    return new Error('The telegram bot has no token yet. Run `human setup telegram` first.');
  }

  return err instanceof Error ? err : new Error(String(err));
}
