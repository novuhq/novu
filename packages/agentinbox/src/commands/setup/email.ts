import pc from 'picocolors';
import { requestAddressVerification } from '../../api/agent-inbox';
import type { ApiClient } from '../../api/client';
import { addAgentEmailIntegration } from '../../api/setup';
import { info, promptLine } from '../../cli-io';
import { startWaitIndicator } from '../../spinner';
import { parseEmailAddress, waitForVerifiedEmail } from '../link-channel';
import type { SetupOptions } from './operator';

/**
 * Email needs no linking dance: the relay gets a per-agent Agent Email Inbox
 * with a shared inbound address, and the person's identity is
 * their email on the subscriber (delivery target + inbound reply resolution —
 * no ChannelEndpoint involved).
 */
export class AgentInboxProvisioningError extends Error {
  readonly original: unknown;

  constructor(original: unknown) {
    super(original instanceof Error && original.message ? original.message : 'Could not provision the agent inbox.');
    this.name = 'AgentInboxProvisioningError';
    this.original = original;
  }
}

export async function ensureAgentInbox(
  client: ApiClient,
  agentIdentifier: string
): Promise<{ identifier: string; inboundAddress?: string }> {
  try {
    const link = await addAgentEmailIntegration(client, agentIdentifier);

    return { identifier: link.integration.identifier, inboundAddress: link.integration.sharedInboundAddress };
  } catch (err) {
    throw new AgentInboxProvisioningError(err);
  }
}

/** `npx @agentinbox/cli setup` with no channel: the inbox is the whole result, so it has to be spelled out. */
export async function announceAgentInbox(client: ApiClient, agentIdentifier: string): Promise<void> {
  const { inboundAddress } = await ensureAgentInbox(client, agentIdentifier);

  if (client.isKeyless) {
    info('Your agent inbox is ready.');
    if (inboundAddress) {
      info(`Mail ${pc.bold(inboundAddress)} from the address you gave to see it work.`);
    }
    info('Outbound email starts after you claim this setup. Run `npx @agentinbox/cli login`.');

    return;
  }

  info(inboundAddress ? `Your agent inbox is ${pc.bold(inboundAddress)}.` : 'Your agent inbox is ready.');
}

export async function connectEmail(
  client: ApiClient,
  agentIdentifier: string,
  subscriberId: string,
  options: SetupOptions
): Promise<string> {
  const { identifier, inboundAddress } = await ensureAgentInbox(client, agentIdentifier);
  // Said before the verification wait, which can last a while.
  info(inboundAddress ? `Your agent inbox is ${pc.bold(inboundAddress)}.` : 'Your agent inbox is ready.');

  if (!options.email && !process.stdin.isTTY) {
    throw new Error('Pass --email <address> when running `npx @agentinbox/cli setup email` non-interactively.');
  }

  const email = options.email?.trim() ? parseEmailAddress(options.email) : await promptForEmail();
  if (!email) {
    throw new Error('No valid email address provided. Re-run `npx @agentinbox/cli setup email` or pass --email.');
  }

  info('Registering your email address...');
  const sent = await requestAddressVerification(client, {
    subscriberId,
    agentIdentifier,
    via: 'email',
    address: email,
  });
  info(`Verification email sent to ${pc.bold(email)} (shown as ${sent.address}).`);

  const stopIndicator = startWaitIndicator(
    'Waiting for you to verify your email',
    'Ctrl-C detaches; resume with: npx @agentinbox/cli setup email'
  );
  try {
    await waitForVerifiedEmail(
      client,
      subscriberId,
      agentIdentifier,
      sent.requestedAt,
      'you verify your email',
      'Re-run `npx @agentinbox/cli setup email` to resend.'
    );
  } finally {
    stopIndicator();
  }

  if (inboundAddress) {
    info(`Replies go to ${pc.bold(inboundAddress)} — answering an interaction is just replying to its email.`);
  }
  if (client.isKeyless) {
    info(
      'Outbound email starts after you claim this setup — use the link in that email, or run `npx @agentinbox/cli login`.'
    );
  }

  return identifier;
}

async function promptForEmail(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const email = parseEmailAddress(await promptLine('Your email address: '));
    if (email) return email;
    process.stdout.write(`${pc.yellow('That does not look like an email address.')}\n`);
  }

  throw new Error('No valid email address provided. Re-run `npx @agentinbox/cli setup email` or pass --email.');
}
