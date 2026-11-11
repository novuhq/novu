import { type ApiClient, ApiError } from '../../api/client';
import { getWhatsAppSetup, type WhatsAppSetup } from '../../api/setup';
import { success } from '../../cli-io';
import { buildWhatsAppSetupPageUrl, waitForWhatsAppSetup } from '../link-channel';
import { defaultSetupIo, handOffToSetupPage, type SetupIo } from './prompts';

const RERUN_COMMAND = 'npx @agentinbox/cli channel add whatsapp';

/**
 * Links WhatsApp for the operator. Meta's Facebook button only runs in a browser on agentinbox.md, so the CLI sends
 * the operator to its WhatsApp drawer, which connects the business number and then has them send a code from their
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

  const setup = await readWhatsAppSetup(client, agentIdentifier);

  if (setup.connected) {
    success(`WhatsApp already connected${connectedNumbers(setup)}.`);

    return;
  }

  await handOffToSetupPage({
    channelLabel: 'WhatsApp',
    rerunCommand: RERUN_COMMAND,
    intro: setup.businessConnected
      ? 'Your WhatsApp Business number is connected; now send the code from your own WhatsApp.'
      : 'Connect your WhatsApp Business number, then send the code from your own WhatsApp.',
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

  if (!setup.enabled || !setup.available) {
    throw new Error(unavailable(setup.reason));
  }

  return setup;
}

function unavailable(reason?: WhatsAppSetup['reason']): string {
  const why = reason === 'missing_platform_config' ? ' (agentinbox.md has no WhatsApp app set up here)' : '';

  return `WhatsApp isn't available for this agent yet${why}. Use telegram, slack, or email for now.`;
}

function connectedNumbers(setup: WhatsAppSetup): string {
  const numbers = [
    setup.displayPhoneNumber ? `on ${setup.displayPhoneNumber}` : '',
    setup.operatorPhoneNumber ? `your number ${setup.operatorPhoneNumber}` : '',
  ].filter(Boolean);

  return numbers.length ? ` (${numbers.join(', ')})` : '';
}
