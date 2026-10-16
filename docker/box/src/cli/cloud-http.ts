// Requests to a box's Worker and the host's routes, through what Cloudflare and the box answer while they can't yet.

import { setTimeout as sleep } from 'node:timers/promises';
import * as z from 'zod';
import { log } from '../node/main.ts';
import { stopping } from '../node/process.ts';
import { fromJson } from '../shared/contracts.ts';
import { DOMAIN, EXIT_MARK, HOST } from '../shared/names.ts';

export type Token = () => Promise<string>;

export interface FetchInit {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly body?: string | Uint8Array;
}

async function send(url: string, { method = 'GET', body }: FetchInit, token: Token): Promise<Response> {
  const headers: Record<string, string> = { Authorization: `Bearer ${await token()}` };
  if (typeof body === 'string') headers['Content-Type'] = 'application/json';

  return fetch(url, { method, headers, ...(body !== undefined && { body }), signal: stopping.signal }).catch(
    (error: Error) => {
      throw new Error(`${url}: ${error.message}`);
    }
  );
}

// The Worker's own answer, Cloudflare's HTML page (`missing` for its 404), or a box that saves.
function answerOf(response: Response): 'own' | 'page' | 'missing' | 'saving' {
  if (response.headers.get('content-type')?.includes('text/html')) return response.status === 404 ? 'missing' : 'page';

  return response.status === 503 && response.headers.get('x-box-phase') === 'saving' ? 'saving' : 'own';
}

// Right after a deploy, Cloudflare answers an HTML page, a 404 (the new workers.dev name isn't live everywhere yet) or
// error 1042 (the host's class isn't reachable yet), for up to a minute; while a box saves, 503 with X-Box-Phase:
// saving, for up to 15 minutes. Cloudflare's 404 page means the Worker doesn't exist: null when `missing` is set.
export async function fetchThrough(url: string, init: FetchInit, token: Token, missing: boolean) {
  const host = new URL(url).hostname;
  const savingUntil = Date.now() + 15 * 60_000;
  for (let pages = 0; ; ) {
    const response = await send(url, init, token);
    const answer = answerOf(response);
    if (answer === 'own') return response;
    await response.body?.cancel();
    if (answer === 'missing' && missing) return null;
    if (answer === 'saving') {
      if (Date.now() > savingUntil) throw new Error(`${host} is still saving after 15 minutes`);
      log(`${host} is saving to its snapshot; waiting`);
      await sleep(15_000, undefined, { signal: stopping.signal });
    } else {
      if (++pages === 45) throw new Error(`${url} answers Cloudflare's ${response.status} page after 90 s`);
      await sleep(2000, undefined, { signal: stopping.signal });
    }
  }
}

export async function boxFetch(url: string, init: FetchInit, token: Token): Promise<Response> {
  const response = await fetchThrough(url, init, token, false);
  if (!response) throw new Error(`${url} doesn't exist`);

  return response;
}

export async function decoded<T>(response: Response, schema: z.ZodType<T>, what: string): Promise<T> {
  const answer = fromJson(schema).safeParse(await response.text());
  if (!answer.success) throw new Error(`${what}: ${z.prettifyError(answer.error)}`);

  return answer.data;
}

// The host's routes (src/cloud/boxes.ts): list, create and delete boxes' Workers.
export async function hostBoxes<T>(
  path: string,
  schema: z.ZodType<T>,
  { method = 'GET', token }: { readonly method?: 'GET' | 'PUT' | 'DELETE'; readonly token: Token }
): Promise<T> {
  const what = `${method} ${HOST}/__box/${path}`;
  const response = await boxFetch(`https://${HOST}.${DOMAIN}/__box/${path}`, { method }, token);
  if (!response.ok) throw new Error(`${what} -> ${response.status}: ${(await response.text()).slice(0, 300)}`);

  return decoded(response, schema, what);
}

// The host answers its own plain-text 404; Cloudflare's 404 page (HTML) means it isn't deployed.
export async function hostExists(): Promise<boolean> {
  const response = await fetch(`https://${HOST}.${DOMAIN}/`, { signal: stopping.signal }).catch(() => null);
  await response?.body?.cancel();

  return response?.status === 404 && Boolean(response.headers.get('content-type')?.includes('text/plain'));
}

// A command's output from /__box/exec, printed as it comes unless `capture`, and its exit code from the last line.
export async function readExec(response: Response, capture: boolean) {
  const decoder = new TextDecoder();
  let text = '';
  let printed = 0;
  for await (const chunk of response.body ?? []) {
    text += decoder.decode(chunk, { stream: true });
    if (capture) continue;
    // Holds back the last line, which may be the exit mark.
    const upTo = text.lastIndexOf('\n') + 1;
    if (upTo > printed) {
      process.stdout.write(text.slice(printed, upTo).replace(new RegExp(`\\n?${EXIT_MARK} \\d+\\n$`), ''));
      printed = upTo;
    }
  }
  const match = text.match(new RegExp(`\\n${EXIT_MARK} (\\d+)\\n?$`));

  return { exitCode: match ? Number(match[1]) : 1, output: text.slice(0, match?.index ?? text.length) };
}
