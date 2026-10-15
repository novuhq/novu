import pc from 'picocolors';
import type { ApiClient } from '../../api/client';
import { ApiError } from '../../api/client';
import {
  createSlackIntegration,
  type IntegrationRecord,
  linkAgentIntegration,
  listAgentIntegrations,
  listIntegrations,
} from '../../api/setup';
import { info, promptLine, promptSecret } from '../../cli-io';
import { openInBrowser } from '../../open-browser';
import { SetupStillPendingError } from '../../output';
import { renderQR } from '../../qr';
import { SETUP_PAGE_POLL_TIMEOUT_MS, type SetupPageOutcome } from '../link-channel';

/** Terminal/browser side effects, injectable so the connect flows are unit-testable. */
export interface SetupIo {
  isTTY: boolean;
  write: (text: string) => void;
  openInBrowser: (url: string) => void;
  prompt: (question: string) => Promise<string>;
  /** Same as `prompt`, but the answer is not echoed — for pasted credentials. */
  promptSecret: (question: string) => Promise<string>;
}

/** Where the person supplies Telegram or Slack credentials. */
export type CredentialEntry = 'cli' | 'page';

const BOTFATHER_URL = 'https://t.me/botfather';

export interface SetupPageHandoff {
  channelLabel: string;
  rerunCommand: string;
  intro: string;
  waiting: string;
  savedMessage: string;
  pageUrl: string;
  poll: () => Promise<SetupPageOutcome>;
  io: SetupIo;
}

export const defaultSetupIo: SetupIo = {
  isTTY: Boolean(process.stdin.isTTY),
  write: (text) => process.stdout.write(text),
  openInBrowser,
  prompt: promptLine,
  promptSecret,
};

/**
 * Sends the person to the credential landing page and blocks until the page has
 * saved the credentials. Prints a single handoff (QR on a TTY, always the URL)
 * and otherwise stays quiet — the page owns the rest of the chain.
 */
export async function handOffToSetupPage(handoff: SetupPageHandoff): Promise<void> {
  const { io, pageUrl } = handoff;

  io.write(
    `\n${handoff.intro} Finish that on this page` +
      (io.isTTY ? ` (scan with your phone, or use the link):\n\n${renderQR(pageUrl)}\n\n` : ':\n\n') +
      `  ${pc.underline(pageUrl)}\n\n` +
      `${pc.dim(handoff.waiting)}\n`
  );

  if (io.isTTY) {
    io.openInBrowser(pageUrl);
  }

  const outcome = await handoff.poll();

  switch (outcome) {
    case 'saved':
      info(handoff.savedMessage);

      return;
    case 'expired':
      throw new SetupStillPendingError(
        `The ${handoff.channelLabel} setup link expired before it was completed. Re-run \`${handoff.rerunCommand}\` for a fresh link.`
      );
    case 'invalid':
      throw new Error(
        `The ${handoff.channelLabel} setup link is no longer valid. Re-run \`${handoff.rerunCommand}\` for a fresh link.`
      );
    case 'timeout':
      throw new SetupStillPendingError(
        `Setup was not completed within ${Math.round(SETUP_PAGE_POLL_TIMEOUT_MS / 60_000)} minutes. ` +
          `Re-run \`${handoff.rerunCommand}\` to pick up where you left off.`
      );
    default: {
      const exhaustive: never = outcome;

      return exhaustive;
    }
  }
}

export interface Choice<T> {
  /** How the option reads in the list, e.g. `Telegram`. */
  label: string;
  /** Words that also select it, on top of its position in the list. */
  aliases: readonly string[];
  value: T;
}

interface ChoiceCopy {
  heading: string;
  question: string;
  /** Shown on a bad answer, and raised if the person never gives a good one. */
  retry: string;
}

const MAX_PROMPT_ATTEMPTS = 5;

export async function promptChoice<T>(
  io: SetupIo,
  copy: ChoiceCopy,
  choices: readonly Choice<T>[],
  options: { skippable: true }
): Promise<T | undefined>;
export async function promptChoice<T>(io: SetupIo, copy: ChoiceCopy, choices: readonly Choice<T>[]): Promise<T>;
/**
 * A numbered menu. Answers match either the position (`1`) or an alias
 * (`telegram`); a skippable menu also takes a bare Enter. Headless runs have no
 * menu to answer, so every caller decides what that means before asking.
 */
export async function promptChoice<T>(
  io: SetupIo,
  copy: ChoiceCopy,
  choices: readonly Choice<T>[],
  options: { skippable?: boolean } = {}
): Promise<T | undefined> {
  const list = choices.map((choice, index) => `  ${pc.bold(String(index + 1))}. ${choice.label}\n`).join('');
  io.write(`\n${copy.heading}\n${list}\n`);

  for (let attempt = 0; attempt < MAX_PROMPT_ATTEMPTS; attempt++) {
    const answer = (await io.prompt(copy.question)).trim().toLowerCase();

    if (!answer && options.skippable) {
      return undefined;
    }

    const picked = choices.find((choice, index) => answer === String(index + 1) || choice.aliases.includes(answer));
    if (picked) {
      return picked.value;
    }

    io.write(`${pc.yellow(copy.retry)}\n`);
  }

  throw new Error(copy.retry);
}

/**
 * On a TTY, ask whether to paste credentials in this terminal or finish on
 * the landing page. Headless runs cannot paste, so they go straight to the page.
 */
export async function resolveCredentialEntry(
  io: SetupIo,
  copy: { heading: string; pasteLabel: string }
): Promise<CredentialEntry> {
  if (!io.isTTY) {
    return 'page';
  }

  return promptChoice<CredentialEntry>(
    io,
    {
      heading: copy.heading,
      question: 'Choice [1-2]: ',
      retry: 'Pick 1 to paste credentials here, or 2 to open the setup page.',
    },
    [
      { label: copy.pasteLabel, aliases: ['cli', 'paste', 'terminal'], value: 'cli' },
      { label: `Use a setup page ${pc.dim('(QR or browser)')}`, aliases: ['page', 'browser', 'web'], value: 'page' },
    ]
  );
}

/** Wrong-token-type guardrails, mirrored from `novu connect`. */
export function validateSlackConfigTokenFormat(token: string): string | undefined {
  if (!token) return 'Paste an App Configuration Token to continue.';
  if (token.startsWith('xoxb-'))
    return 'That looks like a bot token (xoxb-). App Configuration Tokens start with xoxe.xoxp-.';
  if (token.startsWith('xapp-'))
    return 'That looks like an app-level token (xapp-). App Configuration Tokens start with xoxe.xoxp-.';
  if (token.startsWith('xoxp-') && !token.startsWith('xoxe.'))
    return 'That looks like a user token (xoxp-). App Configuration Tokens start with xoxe.xoxp-.';
  if (!token.startsWith('xoxe.'))
    return 'App Configuration Tokens start with xoxe. — generate one at the bottom of api.slack.com/apps.';

  return undefined;
}

/** Reuse an integration already linked to the relay, else create + link one. */
export async function resolveLinkedIntegration(
  client: ApiClient,
  agentIdentifier: string,
  providerId: string,
  create: () => Promise<IntegrationRecord>
): Promise<string> {
  const links = await listAgentIntegrations(client, agentIdentifier);
  const linked = links.find((l) => l.integration.providerId === providerId && l.integration.active !== false);
  if (linked) return linked.integration.identifier;

  info(`Creating a ${providerId} integration...`);
  const all = await listIntegrations(client);
  const existing = all.find((i) => i.providerId === providerId && i.channel === 'chat');
  const integration = existing ?? (await create());
  await linkAgentIntegration(client, agentIdentifier, integration.identifier).catch((err) => {
    if (!(err instanceof ApiError) || err.status !== 409) throw err;
  });

  return integration.identifier;
}

/** Slack needs the full integration record (`_id` for quick-setup), not just the identifier. */
export async function resolveLinkedSlackIntegration(
  client: ApiClient,
  agentIdentifier: string,
  agentName: string
): Promise<IntegrationRecord> {
  const identifier = await resolveLinkedIntegration(client, agentIdentifier, 'slack', () =>
    createSlackIntegration(client, agentName)
  );
  const all = await listIntegrations(client);
  const integration = all.find((i) => i.identifier === identifier);

  if (!integration) {
    throw new Error(`Slack integration "${identifier}" was linked but could not be loaded.`);
  }

  return integration;
}
