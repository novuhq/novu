import pc from 'picocolors';
import { type ApiClient, ApiError } from '../../api/client';
import {
  generateConnectOauthUrl,
  hasChannelEndpoint,
  type IntegrationRecord,
  issueSlackSetupLink,
  slackQuickSetup,
} from '../../api/setup';
import { info, success } from '../../cli-io';
import { openInBrowser } from '../../open-browser';
import { sleep } from '../../poll';
import { renderQR } from '../../qr';
import { openedScreen } from '../../screen/screen';
import {
  buildSetupPageUrl,
  CREDENTIAL_PROPAGATION_TIMEOUT_MS,
  isMissingSlackCredentialsError,
  waitForEndpoint,
  waitForSlackSetupPage,
} from '../link-channel';
import type { SetupOptions } from './operator';
import {
  defaultSetupIo,
  handOffToSetupPage,
  resolveCredentialEntry,
  resolveLinkedSlackIntegration,
  type SetupIo,
  validateSlackConfigTokenFormat,
} from './prompts';

/**
 * Links Slack for the person. When the app does not exist yet, a TTY asks
 * whether to paste an App Configuration Token here or create the app on the
 * landing page; without a TTY, setup uses the page. `--slack-config-token`
 * skips that choice. Either way this then opens Slack's install page. The
 * OAuth URL is too long for a QR, so a terminal opens the browser instead —
 * but the raw URL is always printed too, because the opener is best-effort
 * (SSH sessions, headless boxes) and setup would otherwise block with nothing
 * to click.
 */
export async function connectSlack(
  client: ApiClient,
  agent: { id: string; identifier: string; name: string },
  subscriberId: string,
  options: Pick<SetupOptions, 'slackConfigToken'>,
  io: SetupIo = defaultSetupIo
): Promise<string> {
  const { id: agentId, identifier: agentIdentifier } = agent;
  const integration = await resolveLinkedSlackIntegration(client, agentIdentifier, agent.name);

  if (await hasChannelEndpoint(client, integration.identifier, subscriberId)) {
    success('Slack already connected.');

    return integration.identifier;
  }

  const authorizeUrl = await resolveSlackInstall(
    client,
    agentId,
    agentIdentifier,
    integration,
    subscriberId,
    options,
    io
  );

  const waitingFor = 'the Slack install to complete';
  const screen = openedScreen();

  if (!screen) {
    io.write(
      `\nAuthorize the Slack app in your workspace` +
        (io.isTTY ? ' (opening it in your browser; use the link if it does not open)' : '') +
        `:\n\n  ${pc.underline(authorizeUrl)}\n\n`
    );
  }
  if (io.isTTY) {
    io.openInBrowser(authorizeUrl);
  }

  const stopWaiting = screen?.wait({
    subtitle: `Authorize the Slack app in your workspace${io.isTTY ? ' (opening it in your browser; use the link if it does not open)' : ''}.`,
    rows: [{ mark: 'next', value: pc.underline(authorizeUrl), whole: true }],
    status: { text: `Waiting for ${waitingFor}` },
    said: 'Authorize the Slack app in your workspace.',
  });
  await waitForEndpoint(client, integration.identifier, subscriberId, waitingFor).finally(stopWaiting);
  success('Slack connected.');

  return integration.identifier;
}

/**
 * Produces the OAuth install URL, first making sure the integration has a
 * Slack app: from `--slack-config-token`, pasted at the prompt, or created
 * on the landing page.
 */
async function resolveSlackInstall(
  client: ApiClient,
  agentId: string,
  agentIdentifier: string,
  integration: IntegrationRecord,
  subscriberId: string,
  options: Pick<SetupOptions, 'slackConfigToken'>,
  io: SetupIo
): Promise<string> {
  const buildUrl = () =>
    generateConnectOauthUrl(client, {
      integrationIdentifier: integration.identifier,
      agentIdentifier,
      subscriberId,
    });

  try {
    return await buildUrl();
  } catch (err) {
    if (!isMissingSlackCredentialsError(err)) throw err;
  }

  await runSlackQuickSetup(client, agentId, agentIdentifier, integration, subscriberId, options, io);

  // Credentials can take a moment to become readable after the app is created.
  const deadline = Date.now() + CREDENTIAL_PROPAGATION_TIMEOUT_MS;
  while (true) {
    try {
      return await buildUrl();
    } catch (err) {
      if (!isMissingSlackCredentialsError(err) || Date.now() >= deadline) throw err;
      await sleep(2_000);
    }
  }
}

/** Returns true when the landing page (not this process) created the Slack app. */
async function runSlackQuickSetup(
  client: ApiClient,
  agentId: string,
  agentIdentifier: string,
  integration: IntegrationRecord,
  subscriberId: string,
  options: Pick<SetupOptions, 'slackConfigToken'>,
  io: SetupIo
): Promise<boolean> {
  const tokenFromFlag = options.slackConfigToken?.trim();

  if (tokenFromFlag) {
    const formatError = validateSlackConfigTokenFormat(tokenFromFlag);
    if (formatError) throw new Error(formatError);
    info('Creating the Slack app...');
    await slackQuickSetup(client, integration._id, { configToken: tokenFromFlag, agentId });

    return false;
  }

  const entry = await resolveCredentialEntry(io, {
    heading: 'How do you want to create the Slack app?',
    pasteLabel: 'Paste an App Configuration Token here',
  });

  switch (entry) {
    case 'cli':
      await promptAndRunSlackQuickSetup(client, agentId, integration, io);

      return false;
    case 'page': {
      const setupLink = await issueSlackSetupLink(client, agentIdentifier, integration._id, subscriberId);
      const setupUrl = buildSetupPageUrl(client.apiUrl, 'slack', setupLink.token, setupLink.url);

      await handOffToSetupPage({
        channelLabel: 'Slack',
        rerunCommand: 'npx @agentinbox/cli setup slack',
        intro: 'Slack needs a one-time App Configuration Token to create your app.',
        waiting: 'Waiting for you to connect Slack… the link stays open while the page is open.',
        savedMessage: 'Slack app created.',
        pageUrl: setupUrl,
        poll: () => waitForSlackSetupPage(client, setupLink.token),
        io,
      });

      return true;
    }
    default: {
      const exhaustive: never = entry;

      return exhaustive;
    }
  }
}

async function promptAndRunSlackQuickSetup(
  client: ApiClient,
  agentId: string,
  integration: IntegrationRecord,
  io: SetupIo
): Promise<void> {
  io.write(
    `\nSlack needs a one-time App Configuration Token to create your app:\n` +
      `  1. Open ${pc.underline('https://api.slack.com/apps')}\n` +
      `  2. Scroll to ${pc.bold('Your App Configuration Tokens')} and generate one\n` +
      `  3. Paste the ${pc.bold('xoxe.xoxp-...')} token below\n\n`
  );

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = (await io.promptSecret('Slack App Configuration Token: ')).trim();
    const formatError = validateSlackConfigTokenFormat(token);
    if (formatError) {
      io.write(`${pc.yellow(formatError)}\n`);
      continue;
    }

    try {
      info('Creating the Slack app...');
      await slackQuickSetup(client, integration._id, { configToken: token, agentId });

      return;
    } catch (err) {
      // Only a 400 means Slack rejected the token before any app was created.
      // Anything else (409 link conflict, 404, 5xx) happens after or outside
      // that step — re-pasting would create a second app, so stop here.
      if (!(err instanceof ApiError) || err.status !== 400) throw err;
      io.write(`${pc.yellow(err.message)}\n`);
    }
  }

  throw new Error(
    'Slack did not accept the App Configuration Token. Generate a fresh one and re-run `npx @agentinbox/cli setup slack`.'
  );
}
