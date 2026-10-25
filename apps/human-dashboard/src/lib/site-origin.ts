import 'server-only';

import { headers } from 'next/headers';
import { cache } from 'react';

import { API_PROXY_PATH } from './novu-api';

/**
 * Where this dashboard is served, such as `http://localhost:4300` or `https://agentinbox.md`: the links it
 * hands out, an agent's public card above all, point there. `AGENT_INBOX_DASHBOARD_URL` sets it, with the
 * value the API has as `HUMAN_DASHBOARD_URL`; without it, it's the address the page was asked for.
 *
 * One read per request.
 */
export const readSiteOrigin = cache(async (): Promise<string> => {
  const configured = originOf(process.env.AGENT_INBOX_DASHBOARD_URL);
  if (configured) {
    return configured;
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? 'localhost:4300';
  const protocol = requestHeaders.get('x-forwarded-proto') ?? (isLocal(host) ? 'http' : 'https');

  return `${protocol}://${host}`;
});

/**
 * The API the setup prompts tell an agent's CLI to use: this site's Agent Inbox API, such as
 * `https://www.agentinbox.md/api`, which forwards to the US Novu API. Agent Inbox has no EU region.
 */
export async function readApiUrl(): Promise<string> {
  return `${await readSiteOrigin()}${API_PROXY_PATH}`;
}

/** `https://agentinbox.md` of `https://agentinbox.md/`, or `null` for a setting that is empty or no URL. */
function originOf(setting: string | undefined): string | null {
  if (!setting?.trim()) {
    return null;
  }

  try {
    return new URL(setting.trim()).origin;
  } catch {
    return null;
  }
}

function isLocal(host: string): boolean {
  const name = host.replace(/:\d+$/, '');

  return name === 'localhost' || name === '127.0.0.1' || name === '[::1]' || name.endsWith('.localhost');
}
