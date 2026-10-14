import pc from 'picocolors';
import { createInvite, getContact, requestAddressVerification, setupRelay } from '../api/agent-inbox';
import { type ApiClient } from '../api/client';
import { type AgentIntegrationLink, hasChannelEndpoint, listAgentIntegrations } from '../api/setup';
import { info, promptLine } from '../cli-io';
import { CLI_COMMAND } from '../config';
import { renderQR } from '../qr';
import { startWaitIndicator } from '../spinner';
import { contactIdFromEmail, findContactByEmail, isEmailAddress, resolveEmailContact } from './email-contact';
import { clientFromConfig, handleError } from './interact';
import {
  CHANNEL_NAMES,
  type ChannelName,
  findLinkedIntegration,
  generateSlackUserOauthUrl,
  isChannelName,
  issueTelegramSubscriberLinkWithRetry,
  parseEmailAddress,
  waitForEndpoint,
  waitForVerifiedChannels,
  waitForVerifiedEmail,
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
const INVITE_PAGE_CHANNELS: readonly ChannelName[] = ['telegram', 'slack', 'email'];

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
  contactId: string;
  /** Channels the contact is reachable on; empty while an issued link is still unopened (`--async`). */
  linkedOn: ChannelName[];
  alreadyLinked: boolean;
  /** The `--via` connect URL, or the invite-page link. */
  url?: string;
  /** Invite-page links only: ISO timestamp after which the link stops working. */
  expiresAt?: string;
}

export function parseInviteContactId(raw: string): string {
  const id = raw.trim();
  if (!id) {
    throw new Error(`Pass the contact to invite, e.g. \`${CLI_COMMAND} contact invite alice\`.`);
  }

  if (id.includes(',')) {
    throw new Error(`Invite one person at a time. Repeat \`${CLI_COMMAND} contact invite\` for each.`);
  }

  return id;
}

/**
 * Validates an explicit `--via`. Without one there is nothing to infer: the
 * invite page lets the contact pick among the relay's chat channels.
 */
export function resolveInviteVia(viaFlag?: string): ChannelName | undefined {
  if (!viaFlag) {
    return undefined;
  }

  const normalized = viaFlag.toLowerCase();
  if (!isChannelName(normalized)) {
    throw new Error(`Unknown channel "${viaFlag}". Use one of: ${CHANNEL_NAMES.join(', ')}.`);
  }

  return normalized;
}

/**
 * `contact invite alice@acme.com` is `contact invite alice --via email --email alice@acme.com`. The id
 * comes from the address, unless a contact already has that address or the id belongs to someone else.
 */
export function emailInviteOptions(email: string, options: InviteOptions): InviteOptions {
  if (options.via && options.via.toLowerCase() !== 'email') {
    throw new Error(
      `An email address invites on email. To invite on ${options.via}, pass an id: \`${CLI_COMMAND} contact invite ${contactIdFromEmail(email)} --via ${options.via}\`.`
    );
  }

  if (options.email && options.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
    throw new Error('Pass the email address once: as the contact, or with --email.');
  }

  return { ...options, via: 'email', email };
}

export async function runInvite(contactArg: string, inviteOptions: InviteOptions): Promise<InviteResult> {
  const parsed = parseInviteContactId(contactArg);
  const { client, config } = clientFromConfig(inviteOptions.apiUrl);
  const agentIdentifier = config.relayAgentIdentifier;
  const byEmail = isEmailAddress(parsed);
  const options = byEmail ? emailInviteOptions(parsed, inviteOptions) : inviteOptions;
  const contactId = byEmail ? (await resolveEmailContact(client, agentIdentifier, parsed)).id : parsed;
  const via = resolveInviteVia(options.via);
  const links = await listAgentIntegrations(client, agentIdentifier);

  if (!via) {
    return inviteViaPage(client, contactId, agentIdentifier, links, options);
  }

  const linked = findLinkedIntegration(links, via);
  const name = splitName(options.name);

  if (!linked) {
    throw new Error(`No ${via} channel is connected yet. Run \`${CLI_COMMAND} channel add ${via}\` first.`);
  }

  let result: InviteResult;
  switch (via) {
    case 'email':
      result = await inviteEmail(client, contactId, agentIdentifier, linked.integration.sharedInboundAddress, options);
      break;
    case 'telegram':
      await setupRelay(client, { subscriberId: contactId, agentIdentifier, ...name, defaultVia: via });
      result = await inviteTelegram(client, contactId, linked.integration.identifier, options);
      break;
    case 'slack':
      await setupRelay(client, { subscriberId: contactId, agentIdentifier, ...name, defaultVia: via });
      result = await inviteSlack(client, contactId, agentIdentifier, linked.integration.identifier, options);
      break;
    default: {
      const exhaustive: never = via;
      throw new Error(`Unhandled channel: ${exhaustive}`);
    }
  }

  return result;
}

export async function inviteCommand(contactArg: string, options: InviteOptions): Promise<never> {
  try {
    const result = await runInvite(contactArg, options);
    const who = options.name?.trim() ? `${result.contactId} (${options.name.trim()})` : result.contactId;
    const lead =
      result.linkedOn.length === 0
        ? 'Link issued. After they connect, address them with:'
        : `${who} is ${result.alreadyLinked ? 'already ' : ''}linked on ${formatChannels(result.linkedOn, 'and')}. Address them with:`;

    process.stdout.write(
      `\n${pc.green('✔')} ${lead}\n` + `  ${pc.bold(`${CLI_COMMAND} inbox send ask "…" --to ${result.contactId}`)}\n`
    );

    process.exit(0);
  } catch (err) {
    handleError(err);
  }
}

/**
 * No `--via`: issue a link to the invite page, where the contact connects
 * any of the relay's chat channels and picks their default.
 */
async function inviteViaPage(
  client: ApiClient,
  contactId: string,
  agentIdentifier: string,
  links: AgentIntegrationLink[],
  options: InviteOptions
): Promise<InviteResult> {
  const offeredChannels = INVITE_PAGE_CHANNELS.flatMap((via) => {
    const link = findLinkedIntegration(links, via);

    return link ? [{ via, integrationIdentifier: link.integration.identifier }] : [];
  });

  if (offeredChannels.length === 0) {
    throw new Error(`No Telegram, Slack, or Email channel is connected yet. Run \`${CLI_COMMAND} setup\` first.`);
  }

  const alreadyLinked: ChannelName[] = [];
  for (const channel of offeredChannels) {
    if (channel.via === 'email') {
      if (await isEmailVerified(client, contactId, agentIdentifier)) {
        alreadyLinked.push('email');
      }
    } else if (await hasChannelEndpoint(client, channel.integrationIdentifier, contactId)) {
      alreadyLinked.push(channel.via);
    }
  }

  if (alreadyLinked.length === offeredChannels.length) {
    info(`${contactId} is already connected on ${formatChannels(alreadyLinked, 'and')}.`);

    const name = splitName(options.name);
    if (name) {
      await setupRelay(client, { subscriberId: contactId, agentIdentifier, ...name });
    }

    return { contactId, linkedOn: alreadyLinked, alreadyLinked: true };
  }

  const invite = await createInvite(client, {
    subscriberId: contactId,
    agentIdentifier,
    ...splitName(options.name),
  });
  const expiry = formatExpiry(invite.expiresAt);
  const linkedOn: ChannelName[] = invite.channels.filter((channel) => channel.connected).map((channel) => channel.via);
  const pending = invite.channels.filter((channel) => !channel.connected);
  const pendingVias = pending.map((channel) => channel.via);

  if (linkedOn.length > 0) {
    info(
      `${contactId} is already connected on ${formatChannels(linkedOn, 'and')}; the link lets them add ${formatChannels(pendingVias, 'or')}.`
    );
  }

  process.stdout.write(
    `\nSend this link to ${pc.bold(contactId)} — they choose how your agent reaches them (${formatChannels(
      invite.channels.map((channel) => channel.via),
      'or'
    )}):\n\n  ${pc.underline(invite.url)}\n\n`
  );
  process.stdout.write(`\n${renderQR(invite.url)}\n`);
  info(`The link works until ${pc.bold(expiry)}.`);

  const result: InviteResult = {
    contactId,
    linkedOn,
    alreadyLinked: false,
    url: invite.url,
    expiresAt: invite.expiresAt,
  };

  if (options.async || pending.length === 0) {
    return result;
  }

  const stopIndicator = startWaitIndicator(
    `Waiting for ${contactId} to connect ${formatChannels(pendingVias, 'or')}`,
    `Ctrl-C detaches; the link works until ${expiry}`
  );

  let connectedVia: ChannelName;
  try {
    connectedVia = await waitForVerifiedChannels(
      client,
      contactId,
      agentIdentifier,
      pendingVias,
      `${contactId} connect ${formatChannels(pendingVias, 'or')}`,
      `The link keeps working until ${expiry}; re-run \`${CLI_COMMAND} contact invite ${contactId}\` to check on them.`
    );
  } finally {
    stopIndicator();
  }

  info(`They can add more channels or pick their default from the same link until ${expiry}.`);

  return { ...result, linkedOn: [...linkedOn, connectedVia] };
}

async function inviteTelegram(
  client: ApiClient,
  contactId: string,
  integrationIdentifier: string,
  options: InviteOptions
): Promise<InviteResult> {
  if (await hasChannelEndpoint(client, integrationIdentifier, contactId)) {
    info(`${contactId} is already linked on telegram.`);

    return { contactId, linkedOn: ['telegram'], alreadyLinked: true };
  }

  let subscriberLink: { deepLinkUrl: string; botUsername: string };
  try {
    subscriberLink = await issueTelegramSubscriberLinkWithRetry(client, integrationIdentifier, contactId);
  } catch (err) {
    throw wrapBotTokenError(err);
  }

  printInviteUrl(
    contactId,
    'telegram',
    subscriberLink.deepLinkUrl,
    `Scan this QR (or open the link) and tap ${pc.bold('Start')} in Telegram` +
      (subscriberLink.botUsername ? ` (@${subscriberLink.botUsername})` : '')
  );
  process.stdout.write(`\n${renderQR(subscriberLink.deepLinkUrl)}\n`);

  if (options.async) {
    return { contactId, linkedOn: [], alreadyLinked: false, url: subscriberLink.deepLinkUrl };
  }

  await waitForInvitee(client, integrationIdentifier, contactId, 'telegram', subscriberLink.botUsername);

  return { contactId, linkedOn: ['telegram'], alreadyLinked: false, url: subscriberLink.deepLinkUrl };
}

async function inviteSlack(
  client: ApiClient,
  contactId: string,
  agentIdentifier: string,
  integrationIdentifier: string,
  options: InviteOptions
): Promise<InviteResult> {
  if (await hasChannelEndpoint(client, integrationIdentifier, contactId)) {
    info(`${contactId} is already linked on slack.`);

    return { contactId, linkedOn: ['slack'], alreadyLinked: true };
  }

  const authorizeUrl = await generateSlackUserOauthUrl(client, {
    integrationIdentifier,
    agentIdentifier,
    subscriberId: contactId,
  });

  printInviteUrl(contactId, 'slack', authorizeUrl, 'Open this Slack authorize URL and approve the app');

  if (options.async) {
    return { contactId, linkedOn: [], alreadyLinked: false, url: authorizeUrl };
  }

  await waitForInvitee(client, integrationIdentifier, contactId, 'slack');

  return { contactId, linkedOn: ['slack'], alreadyLinked: false, url: authorizeUrl };
}

async function inviteEmail(
  client: ApiClient,
  contactId: string,
  agentIdentifier: string,
  inboundAddress: string | undefined,
  options: InviteOptions
): Promise<InviteResult> {
  const name = splitName(options.name);
  const contact = await getContact(client, contactId, agentIdentifier).catch(() => null);
  const emailChannel = contact?.channels?.find((channel) => channel.via === 'email');
  const verified = emailChannel?.status === 'verified';
  // A single contact only shows its address masked, so the exact address is checked on the contact list.
  const sameAddress =
    verified && options.email !== undefined
      ? (await findContactByEmail(client, agentIdentifier, options.email))?.id === contactId
      : false;

  if (verified && (!options.email || sameAddress)) {
    info(`${contactId} is already verified on email (${emailChannel?.address ?? contact?.email}).`);

    await setupRelay(client, {
      subscriberId: contactId,
      agentIdentifier,
      ...name,
      defaultVia: 'email',
    });

    return { contactId, linkedOn: ['email'], alreadyLinked: true };
  }

  const email = options.email ? requireEmail(options.email) : await promptInviteEmail();

  const sent = await requestAddressVerification(client, {
    subscriberId: contactId,
    agentIdentifier,
    via: 'email',
    address: email,
    ...name,
  });

  info(`Verification email sent to ${pc.bold(email)} (shown as ${sent.address}).`);
  if (sent.replacesVerifiedAddress) {
    info(`A different address is already verified for ${contactId}; it stays reachable until ${email} is verified.`);
  }
  if (inboundAddress) {
    info(`Once verified, replies go to ${pc.bold(inboundAddress)}.`);
  }

  if (options.async) {
    return { contactId, linkedOn: [], alreadyLinked: false };
  }

  await waitForEmailVerification(client, contactId, agentIdentifier, sent.requestedAt);

  return { contactId, linkedOn: ['email'], alreadyLinked: false };
}

async function isEmailVerified(client: ApiClient, contactId: string, agentIdentifier: string): Promise<boolean> {
  try {
    const contact = await getContact(client, contactId, agentIdentifier);

    return contact.channels?.some((channel) => channel.via === 'email' && channel.status === 'verified') ?? false;
  } catch {
    return false;
  }
}

async function waitForEmailVerification(
  client: ApiClient,
  contactId: string,
  agentIdentifier: string,
  requestedAt: string
): Promise<void> {
  const stopIndicator = startWaitIndicator(
    `Waiting for ${contactId} to verify their email`,
    `Ctrl-C detaches; resume with: ${CLI_COMMAND} contact invite ${contactId} --via email`
  );

  try {
    await waitForVerifiedEmail(
      client,
      contactId,
      agentIdentifier,
      requestedAt,
      `${contactId} verify their email`,
      `Re-run \`${CLI_COMMAND} contact invite ${contactId} --via email\` to resend.`
    );
  } finally {
    stopIndicator();
  }
}

async function waitForInvitee(
  client: ApiClient,
  integrationIdentifier: string,
  contactId: string,
  via: 'telegram' | 'slack',
  botUsername?: string
): Promise<void> {
  const waitingFor =
    via === 'telegram'
      ? `${contactId}'s /start${botUsername ? ` on @${botUsername}` : ''} in Telegram`
      : `${contactId} to finish Slack authorize`;
  const stopIndicator = startWaitIndicator(
    `Waiting for ${contactId} to connect ${via}`,
    `Ctrl-C detaches; resume with: ${CLI_COMMAND} contact invite ${contactId} --via ${via}`
  );

  try {
    await waitForEndpoint(
      client,
      integrationIdentifier,
      contactId,
      waitingFor,
      `Re-run \`${CLI_COMMAND} contact invite ${contactId} --via ${via}\` to continue.`
    );
  } finally {
    stopIndicator();
  }
}

function printInviteUrl(contactId: string, via: ChannelName, url: string, instruction: string): void {
  process.stdout.write(
    `\nSend this ${via} link to ${pc.bold(contactId)} — ${instruction}:\n\n  ${pc.underline(url)}\n\n`
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
    throw new Error(
      `Pass --email <address> when running \`${CLI_COMMAND} contact invite --via email\` non-interactively.`
    );
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
    return new Error(`The telegram bot has no token yet. Run \`${CLI_COMMAND} channel add telegram\` first.`);
  }

  return err instanceof Error ? err : new Error(String(err));
}
