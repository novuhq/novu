import * as z from 'zod';
import { githubToken } from '../cli/cloud-http.ts';
import { fetchJson, HttpError, type JsonInit } from '../node/http.ts';
import {
  Deployment,
  DeploymentStatus,
  IssueComment,
  IssueEvent,
  Permission,
  PullFile,
  type PullRequestEvent,
} from '../shared/contracts.ts';

export const REPO = process.env.GITHUB_REPOSITORY ?? 'novuhq/novu';
export const LABEL = 'box';
const MARK = '<!-- novu-box -->';
// One environment for every PR box, each box's deployment told apart by its task. A new one leaves the environment's
// others active (`auto_inactive`): they're other PRs'.
const ENVIRONMENT = 'Novu Box';

export async function github<T>(path: string, schema: z.ZodType<T>, init: JsonInit = {}): Promise<T> {
  const headers = {
    Authorization: `Bearer ${await githubToken()}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'novu-box',
  };

  return fetchJson(`https://api.github.com${path}`, schema, { ...init, headers }).catch((error: Error) => {
    if (error instanceof HttpError) throw error;
    throw new Error(`GitHub ${init.method ?? 'GET'} ${path}: ${error.message}`);
  });
}

export function unlessMissing(error: Error): null {
  if (error instanceof HttpError && error.status === 404) return null;
  throw error;
}

async function everyPage<T>(path: string, item: z.ZodType<T>): Promise<Array<T>> {
  const items: Array<T> = [];
  for (let page = 1; ; page++) {
    const batch = await github(`${path}?per_page=100&page=${page}`, z.array(item));
    items.push(...batch);
    if (batch.length < 100) return items;
  }
}

const commentIds = new Map<number, number | undefined>();

export async function comment(number: number, body: string, { onlyUpdate = false } = {}): Promise<void> {
  console.log(`comment on #${number}:\n${body}`);
  if (!commentIds.has(number)) {
    const comments = await everyPage(`/repos/${REPO}/issues/${number}/comments`, IssueComment);
    commentIds.set(number, comments.find((item) => item.body?.startsWith(MARK))?.id);
  }
  const id = commentIds.get(number);
  const json = { body: `${MARK}\n${body}` };
  if (id) await github(`/repos/${REPO}/issues/comments/${id}`, z.unknown(), { method: 'PATCH', json });
  else if (!onlyUpdate) {
    const created = await github(`/repos/${REPO}/issues/${number}/comments`, IssueComment, { method: 'POST', json });
    commentIds.set(number, created.id);
  }
}

const deploymentsOf = (box: string, query = '') =>
  github(
    `/repos/${REPO}/deployments?environment=${encodeURIComponent(ENVIRONMENT)}&task=${encodeURIComponent(`deploy:${box}`)}&per_page=100${query}`,
    z.array(Deployment)
  );

// The PR's "View deployment" button, like a Netlify preview's.
export async function deployed({
  box,
  sha,
  url,
  logUrl,
}: {
  readonly box: string;
  readonly sha: string;
  readonly url: string;
  readonly logUrl: string | undefined;
}): Promise<void> {
  const { id } = await github(`/repos/${REPO}/deployments`, Deployment, {
    method: 'POST',
    json: {
      ref: sha,
      task: `deploy:${box}`,
      environment: ENVIRONMENT,
      transient_environment: true,
      auto_merge: false,
      required_contexts: [],
      description: `Novu Box ${box}`,
    },
  });
  await github(`/repos/${REPO}/deployments/${id}/statuses`, z.unknown(), {
    method: 'POST',
    json: { state: 'success', environment_url: url, ...(logUrl && { log_url: logUrl }), auto_inactive: false },
  });
}

// Whether the box's apply of this commit finished healthy: only then is there a deployment of it.
export async function isDeployed(box: string, sha: string): Promise<boolean> {
  const [deployment] = await deploymentsOf(box, `&sha=${sha}`);
  if (!deployment) return false;
  const [status] = await github(
    `/repos/${REPO}/deployments/${deployment.id}/statuses?per_page=1`,
    z.array(DeploymentStatus)
  );

  return status?.state === 'success';
}

// GitHub deletes only inactive deployments, once a repository has more than one.
export async function undeployed(box: string): Promise<void> {
  for (const { id } of await deploymentsOf(box)) {
    await github(`/repos/${REPO}/deployments/${id}/statuses`, z.unknown(), {
      method: 'POST',
      json: { state: 'inactive' },
    });
    await github(`/repos/${REPO}/deployments/${id}`, z.unknown(), { method: 'DELETE' });
  }
}

export async function pullFiles(number: number): Promise<Array<string>> {
  return (await everyPage(`/repos/${REPO}/pulls/${number}/files`, PullFile)).map((file) => file.filename);
}

export async function labeler(event: PullRequestEvent): Promise<string | undefined> {
  if (event.action === 'labeled') return event.sender?.login;
  const events = await everyPage(`/repos/${REPO}/issues/${event.number}/events`, IssueEvent);

  return events.filter((item) => item.event === 'labeled' && item.label?.name === LABEL).at(-1)?.actor?.login;
}

// Write, maintain or admin on the repository (GitHub reports maintain as `write`).
export async function canWrite(login: string | undefined): Promise<boolean> {
  if (!login) return false;
  const answer = await github(`/repos/${REPO}/collaborators/${encodeURIComponent(login)}/permission`, Permission).catch(
    unlessMissing
  );

  return answer?.permission === 'admin' || answer?.permission === 'write';
}
