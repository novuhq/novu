import { NovuError } from '../utils/errors';

export type GetTokenArgs = { topicKey?: string };

/** Returns a Novu subscriber token minted by your backend. */
export type GetToken = (args: GetTokenArgs) => Promise<string>;

export function fromTokenEndpoint(url: string): GetToken {
  return async (args) => {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args.topicKey ? { topicKey: args.topicKey } : {}),
      });
    } catch (error) {
      throw new NovuError(`Failed to reach the token endpoint ${url}`, error);
    }

    if (!response.ok) {
      throw new NovuError(`The token endpoint ${url} answered ${response.status}`, undefined);
    }

    const body = await response.json().catch(() => undefined);
    const token = body?.token;
    if (typeof token !== 'string' || !token) {
      throw new NovuError(`The token endpoint ${url} did not answer with { token }`, body);
    }

    return token;
  };
}
