import 'server-only';

import { init, type LDClient, type LDMultiKindContext } from '@launchdarkly/node-server-sdk';
import { cache } from 'react';

import type { HumanAccount } from './human-account';

/**
 * The flag for the onboarding where the agent says hi with its card, and for that new card on Configure and in the
 * Share dialog's image. The same flag as the API's `FeatureFlagsKeysEnum.IS_AGENT_INBOX_NEW_ONBOARDING_ENABLED`,
 * which it reads for an agent's public card.
 */
export const NEW_ONBOARDING_FLAG = 'IS_AGENT_INBOX_NEW_ONBOARDING_ENABLED';

/** The Agent Inbox features an account has, which some accounts get before everyone. */
export type AgentInboxFeatures = { newOnboarding: boolean };

/** How long a page waits for LaunchDarkly to connect, in seconds, before it shows the dashboard as it was. */
const CONNECT_TIMEOUT_SECONDS = 3;

let connected: Promise<LDClient | null> | null = null;

/**
 * The server's LaunchDarkly client, connected on first use with `LAUNCH_DARKLY_SDK_KEY` (the API's server-side SDK
 * key). `null` without a key, as on a self-hosted or local setup, and while it can't connect: the next request then
 * tries again.
 */
function launchDarkly(): Promise<LDClient | null> {
  const sdkKey = process.env.LAUNCH_DARKLY_SDK_KEY;
  if (!sdkKey) {
    return Promise.resolve(null);
  }

  const current = connected ?? connect(sdkKey);
  connected = current;

  return current;
}

/** Connects a client, or forgets it when it can't, so that the next request tries again. */
function connect(sdkKey: string): Promise<LDClient | null> {
  const client = init(sdkKey);

  return client
    .waitForInitialization({ timeout: CONNECT_TIMEOUT_SECONDS })
    .then(() => client)
    .catch((error: unknown) => {
      console.error('Failed to connect to LaunchDarkly', error);
      client.close();
      connected = null;

      return null;
    });
}

/**
 * Who a flag is asked about: the account's backing organization, as the API asks LaunchDarkly about an organization,
 * so that a flag turned on for an organization is on in both.
 */
export function flagContextOf(organizationId: string): LDMultiKindContext {
  return { kind: 'multi', organization: { key: organizationId } };
}

/**
 * Whether a boolean flag is on for the account's backing organization. Without LaunchDarkly, the environment variable
 * of the flag's name, as the API reads it then. Anything that goes wrong reads as off: the dashboard as it was is
 * always safe to show.
 */
export async function isFlagOn(key: string, organizationId: string): Promise<boolean> {
  const client = await launchDarkly();
  if (!client) {
    return process.env[key] === 'true';
  }

  try {
    return (await client.variation(key, flagContextOf(organizationId), false)) === true;
  } catch (error) {
    console.error(`Failed to read the ${key} flag`, error);

    return false;
  }
}

/** The features of this account, read once per request. */
export const loadFeatures = cache(
  async (account: HumanAccount): Promise<AgentInboxFeatures> => ({
    newOnboarding: await isFlagOn(NEW_ONBOARDING_FLAG, account.organizationId),
  })
);
