import { createPublicApiClient, unwrap } from './client';

/** What a one-time code is traded for: the key `login` would have saved, and the agent it acts as. */
export interface ConnectedAgent {
  apiKey: string;
  environmentId: string;
  agent: { identifier: string; name: string; handle: string };
  /**
   * The host this computer counts as: the one this CLI said it runs in, else the one the code was made for.
   * Missing from an API from before hosts were told apart.
   */
  host?: string;
}

/**
 * Uses a one-time code from agentinbox.md. It works once: a second try, a code that ran out and a wrong one
 * each fail with the API's own words.
 */
export async function connectWithCode(apiUrl: string, input: { agent: string; code: string }): Promise<ConnectedAgent> {
  const res = await createPublicApiClient(apiUrl).post<{ data?: ConnectedAgent } | ConnectedAgent>(
    '/v1/connect',
    input
  );
  const connected = unwrap(res.data);

  if (!connected?.apiKey) {
    throw new Error('The API did not connect this computer. Please try again with a new code.');
  }

  return connected;
}
