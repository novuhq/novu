import { type ApiClient, ApiError } from '../../api/client';
import { getWhatsAppSetup, type WhatsAppSetup } from '../../api/setup';
import { success } from '../../cli-io';
import { DEFAULT_RELAY_AGENT_IDENTIFIER } from '../../config';
import { buildWhatsAppSetupPageUrl, waitForWhatsAppSetup } from '../link-channel';
import { defaultSetupIo, handOffToSetupPage, type SetupIo } from './prompts';

const RERUN_COMMAND = 'npx @agentinbox/cli channel add whatsapp';

/**
 * Links WhatsApp for the operator. Meta's Facebook button only runs in a browser on agentinbox.md, so the CLI sends
 * the operator to its WhatsApp drawer, which connects the business number and then has them send a message from their
 * own number, and waits here until both are done.
 */
export async function connectWhatsApp(
  client: ApiClient,
  agentIdentifier: string,
  io: SetupIo = defaultSetupIo
): Promise<void> {
  if (client.isKeyless) {
    throw new Error(
      'WhatsApp needs an Agent Inbox account: connecting it signs in to Facebook on agentinbox.md. ' +
        'Run `npx @agentinbox/cli login` first, then `channel add whatsapp` again.'
    );
  }

  // The WhatsApp drawer on agentinbox.md connects the operator's own agent only; any other agent would wait on a
  // drawer that never connects it.
  if (agentIdentifier !== DEFAULT_RELAY_AGENT_IDENTIFIER) {
    throw new Error(
      `WhatsApp can only be connected for the ${DEFAULT_RELAY_AGENT_IDENTIFIER} agent for now, on agentinbox.md. ` +
        `"${agentIdentifier}" can use telegram, slack, or email.`
    );
  }

  const setup = await readWhatsAppSetup(client, agentIdentifier);

  if (setup.connected) {
    success(`WhatsApp already connected${connectedNumbers(setup)}.`);

    return;
  }

  await handOffToSetupPage({
    channelLabel: 'WhatsApp',
    rerunCommand: RERUN_COMMAND,
    intro: setup.businessConnected
      ? 'Your WhatsApp Business number is connected; now say hi to it from your own WhatsApp.'
      : 'Connect your WhatsApp Business number, then say hi to it from your own WhatsApp.',
    waiting: 'Waiting for WhatsApp to be connected on agentinbox.md...',
    savedMessage: 'WhatsApp connected.',
    pageUrl: buildWhatsAppSetupPageUrl(client.apiUrl),
    poll: () => waitForWhatsAppSetup(client, agentIdentifier),
    io,
  });
}

/** Where WhatsApp stands, refusing early when this account can't connect it at all. */
async function readWhatsAppSetup(client: ApiClient, agentIdentifier: string): Promise<WhatsAppSetup> {
  let setup: WhatsAppSetup;
  try {
    setup = await getWhatsAppSetup(client, agentIdentifier);
  } catch (err) {
    // An API from before the CLI could read WhatsApp setup answers 403 (dashboard only) or 404.
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
      throw new Error(unavailable());
    }
    throw err;
  }

  // `available` only says whether the Facebook button works here: without it, the page connects with API keys.
  if (!setup.enabled) {
    throw new Error(unavailable());
  }

  return setup;
}

function unavailable(): string {
  return "WhatsApp isn't available for this agent yet. Use telegram, slack, or email for now.";
}

function connectedNumbers(setup: WhatsAppSetup): string {
  const numbers = [
    setup.displayPhoneNumber ? `on ${setup.displayPhoneNumber}` : '',
    setup.operatorPhoneNumber ? `your number ${setup.operatorPhoneNumber}` : '',
  ].filter(Boolean);

  return numbers.length ? ` (${numbers.join(', ')})` : '';
}
