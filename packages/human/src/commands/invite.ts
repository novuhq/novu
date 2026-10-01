import pc from 'picocolors';
import { type HumanApiClient } from '../api/client';
import { createHumanInvite, getContact, requestAddressVerification, setupHumanRelay } from '../api/human';
import { type AgentIntegrationLink, hasChannelEndpoint, listAgentIntegrations } from '../api/setup';
import { info, promptLine } from '../cli-io';
import { renderQR } from '../qr';
import { startWaitIndicator } from '../spinner';
import { clientFromConfig, handleError } from './interact';
import {
  findLinkedIntegration,
  generateSlackUserOauthUrl,
  HUMAN_CHANNELS,
  type HumanChannel,
  isHumanChannel,
  issueTelegramSubscriberLinkWithRetry,
  parseEmailAddress,
  waitForEndpoint,
  waitForVerifiedChannels,
} from './link-channel';

export interface InviteOptions {
  via?: string;
  email?: string;
  /** Display name, e.g. "Alice Chen" — split into firstName/lastName on the subscriber. */
  name?: string;
  async?: boolean;
  apiUrl?: string;
}

/** Channels the invite page can offer when the relay has them linked. */
const INVITE_PAGE_CHANNELS: readonly HumanChannel[] = ['telegram', 'slack', 'email'];

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
  /** Channels the human is reachable on; empty while an issued link is still unopened (`--async`). */
  linkedOn: HumanChannel[];
  alreadyLinked: boolean;
  /** The `--via` connect URL, or the invite-page link. */
  url?: string;
  /** Invite-page links only: ISO timestamp after which the link stops working. */
  expiresAt?: string;
}

export function parseInviteHumanId(raw: string): string {
  const id = raw.trim();
  if (!id) {
    throw new Error('Pass the subscriberId to invite, e.g. `human invite alice`.');
  }

  if (id.includes(',')) {
    throw new Error('Invite one human at a time. Repeat `human invite` for each person.');
  }

  return id;
}

/**
 * Validates an explicit `--via`. Without one there is nothing to infer: the
 * invite page lets the human pick among the relay's chat channels.
 */
export function resolveInviteVia(viaFlag?: string): HumanChannel | undefined {
  if (!viaFlag) {
    return undefined;
  }

  const normalized = viaFlag.toLowerCase();
  if (!isHumanChannel(normalized)) {
    throw new Error(`Unknown channel "${viaFlag}". Use one of: ${HUMAN_CHANNELS.join(', ')}.`);
  }

  return normalized;
}

export async function runInvite(humanIdArg: string, options: InviteOptions): Promise<InviteResult> {
  const humanId = parseInviteHumanId(humanIdArg);
  const via = resolveInviteVia(options.via);
  const { client, config } = clientFromConfig(options.apiUrl);
  const agentIdentifier = config.relayAgentIdentifier;
  const links = await listAgentIntegrations(client, agentIdentifier);

  if (!via) {
    return inviteViaPage(client, humanId, agentIdentifier, links, options);
  }

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
      await setupHumanRelay(client, { subscriberId: humanId, agentIdentifier, ...name, defaultVia: via });
      result = await inviteTelegram(client, humanId, linked.integration.identifier, options);
      break;
    case 'slack':
      await setupHumanRelay(client, { subscriberId: humanId, agentIdentifier, ...name, defaultVia: via });
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
      result.linkedOn.length === 0
        ? 'Link issued. After they connect, address them with:'
        : `${who} is ${result.alreadyLinked ? 'already ' : ''}linked on ${formatChannels(result.linkedOn, 'and')}. Address them with:`;

    process.stdout.write(`\n${pc.green('✔')} ${lead}\n` + `  ${pc.bold(`human ask "…" --to ${result.humanId}`)}\n`);

    process.exit(0);
  } catch (err) {
    handleError(err);
  }
}

/**
 * No `--via`: issue a link to the Novu invite page, where the human connects
 * any of the relay's chat channels and picks their default.
 */
async function inviteViaPage(
  client: HumanApiClient,
  humanId: string,
  agentIdentifier: string,
  links: AgentIntegrationLink[],
  options: InviteOptions
): Promise<InviteResult> {
  const offeredChannels = INVITE_PAGE_CHANNELS.flatMap((via) => {
    const link = findLinkedIntegration(links, via);

    return link ? [{ via, integrationIdentifier: link.integration.identifier }] : [];
  });

  if (offeredChannels.length === 0) {
    throw new Error('No Telegram, Slack, or Email channel is linked to the relay agent. Run `human setup` first.');
  }

  const alreadyLinked: HumanChannel[] = [];
  for (const channel of offeredChannels) {
    if (channel.via === 'email') {
      if (await isEmailVerified(client, humanId, agentIdentifier)) {
        alreadyLinked.push('email');
      }
    } else if (await hasChannelEndpoint(client, channel.integrationIdentifier, humanId)) {
      alreadyLinked.push(channel.via);
    }
  }

  if (alreadyLinked.length === offeredChannels.length) {
    info(`${humanId} is already connected on ${formatChannels(alreadyLinked, 'and')}.`);

    const name = splitName(options.name);
    if (name) {
      await setupHumanRelay(client, { subscriberId: humanId, agentIdentifier, ...name });
    }

    return { humanId, linkedOn: alreadyLinked, alreadyLinked: true };
  }

  const invite = await createHumanInvite(client, {
    subscriberId: humanId,
    agentIdentifier,
    ...splitName(options.name),
  });
  const expiry = formatExpiry(invite.expiresAt);
  const linkedOn: HumanChannel[] = invite.channels.filter((channel) => channel.connected).map((channel) => channel.via);
  const pending = invite.channels.filter((channel) => !channel.connected);
  const pendingVias = pending.map((channel) => channel.via);

  if (linkedOn.length > 0) {
    info(
      `${humanId} is already connected on ${formatChannels(linkedOn, 'and')}; the link lets them add ${formatChannels(pendingVias, 'or')}.`
    );
  }

  process.stdout.write(
    `\nSend this link to ${pc.bold(humanId)} — they choose how your agent reaches them (${formatChannels(
      invite.channels.map((channel) => channel.via),
      'or'
    )}):\n\n  ${pc.underline(invite.url)}\n\n`
  );
  process.stdout.write(`\n${renderQR(invite.url)}\n`);
  info(`The link works until ${pc.bold(expiry)}.`);

  const result: InviteResult = {
    humanId,
    linkedOn,
    alreadyLinked: false,
    url: invite.url,
    expiresAt: invite.expiresAt,
  };

  if (options.async || pending.length === 0) {
    return result;
  }

  const stopIndicator = startWaitIndicator(
    `Waiting for ${humanId} to connect ${formatChannels(pendingVias, 'or')}`,
    `Ctrl-C detaches; the link works until ${expiry}`
  );

  let connectedVia: HumanChannel;
  try {
    connectedVia = await waitForVerifiedChannels(
      client,
      humanId,
      agentIdentifier,
      pendingVias,
      `${humanId} connect ${formatChannels(pendingVias, 'or')}`,
      `The link keeps working until ${expiry}; re-run \`human invite ${humanId}\` to check on them.`
    );
  } finally {
    stopIndicator();
  }

  info(`They can add more channels or pick their default from the same link until ${expiry}.`);

  return { ...result, linkedOn: [...linkedOn, connectedVia] };
}

async function inviteTelegram(
  client: HumanApiClient,
  humanId: string,
  integrationIdentifier: string,
  options: InviteOptions
): Promise<InviteResult> {
  if (await hasChannelEndpoint(client, integrationIdentifier, humanId)) {
    info(`${humanId} is already linked on telegram.`);

    return { humanId, linkedOn: ['telegram'], alreadyLinked: true };
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

  if (options.async) {
    return { humanId, linkedOn: [], alreadyLinked: false, url: subscriberLink.deepLinkUrl };
  }

  await waitForInvitee(client, integrationIdentifier, humanId, 'telegram', subscriberLink.botUsername);

  return { humanId, linkedOn: ['telegram'], alreadyLinked: false, url: subscriberLink.deepLinkUrl };
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

    return { humanId, linkedOn: ['slack'], alreadyLinked: true };
  }

  const authorizeUrl = await generateSlackUserOauthUrl(client, {
    integrationIdentifier,
    agentIdentifier,
    subscriberId: humanId,
  });

  printInviteUrl(humanId, 'slack', authorizeUrl, 'Open this Slack authorize URL and approve the app');

  if (options.async) {
    return { humanId, linkedOn: [], alreadyLinked: false, url: authorizeUrl };
  }

  await waitForInvitee(client, integrationIdentifier, humanId, 'slack');

  return { humanId, linkedOn: ['slack'], alreadyLinked: false, url: authorizeUrl };
}

async function inviteEmail(
  client: HumanApiClient,
  humanId: string,
  agentIdentifier: string,
  inboundAddress: string | undefined,
  options: InviteOptions
): Promise<InviteResult> {
  const name = splitName(options.name);
  const contact = await getContact(client, humanId, agentIdentifier).catch(() => null);
  const emailChannel = contact?.channels?.find((channel) => channel.via === 'email');
  const verified = emailChannel?.status === 'verified';

  if (verified && !options.email) {
    info(`${humanId} is already verified on email (${emailChannel?.address ?? contact?.email}).`);

    await setupHumanRelay(client, {
      subscriberId: humanId,
      agentIdentifier,
      ...name,
      defaultVia: 'email',
    });

    return { humanId, linkedOn: ['email'], alreadyLinked: true };
  }

  const email = options.email ? requireEmail(options.email) : await promptInviteEmail();

  const sent = await requestAddressVerification(client, {
    subscriberId: humanId,
    agentIdentifier,
    via: 'email',
    address: email,
    ...name,
  });

  info(`Verification email sent to ${pc.bold(email)} (shown as ${sent.address}).`);
  if (sent.replacesVerifiedAddress) {
    info(`A different address is already verified for ${humanId}; it stays reachable until ${email} is verified.`);
  }
  if (inboundAddress) {
    info(`Once verified, replies go to ${pc.bold(inboundAddress)}.`);
  }

  if (options.async) {
    return { humanId, linkedOn: [], alreadyLinked: false };
  }

  await waitForEmailVerification(client, humanId, agentIdentifier);

  return { humanId, linkedOn: ['email'], alreadyLinked: false };
}

async function isEmailVerified(client: HumanApiClient, humanId: string, agentIdentifier: string): Promise<boolean> {
  try {
    const contact = await getContact(client, humanId, agentIdentifier);

    return contact.channels?.some((channel) => channel.via === 'email' && channel.status === 'verified') ?? false;
  } catch {
    return false;
  }
}

async function waitForEmailVerification(
  client: HumanApiClient,
  humanId: string,
  agentIdentifier: string
): Promise<void> {
  const stopIndicator = startWaitIndicator(
    `Waiting for ${humanId} to verify their email`,
    `Ctrl-C detaches; resume with: human invite ${humanId} --via email`
  );

  try {
    await waitForVerifiedChannels(
      client,
      humanId,
      agentIdentifier,
      ['email'],
      `${humanId} verify their email`,
      `Re-run \`human invite ${humanId} --via email\` to resend.`
    );
  } finally {
    stopIndicator();
  }
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

/** `['telegram', 'slack']` → "telegram and slack" (or "telegram or slack"). */
export function formatChannels(vias: readonly string[], conjunction: 'and' | 'or'): string {
  if (vias.length <= 1) {
    return vias.join('');
  }

  return `${vias.slice(0, -1).join(', ')} ${conjunction} ${vias[vias.length - 1]}`;
}

/** Invite expiry in the operator's local time, e.g. "Thu, Oct 2, 02:05 PM". */
function formatExpiry(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
