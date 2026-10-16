#!/usr/bin/env node
// Novu Box per pull request, run by .github/workflows/novu-box.yml (README, "Per pull request"). It drives boxes as
// `box --cloud` does (src/cli/cloud.ts), signed in with the workflow's GitHub Actions OIDC token, and has the host
// create and delete their Workers (src/cloud/boxes.ts), so the workflow holds no secret. Run by hand, it signs in
// with GITHUB_TOKEN or `gh auth token` instead.
//
//   node docker/box/src/ci/ci.ts pr       the pull_request event in GITHUB_EVENT_PATH: start the PR's box pr-<number>
//                                         from base and apply the PR's head, or delete the box; one sticky PR
//                                         comment says how it went
//   node docker/box/src/ci/ci.ts cleanup  delete pr-* boxes whose PR is closed or no longer labeled `box`
//   node docker/box/src/ci/ci.ts rebake   bake base again from next and save it to its snapshot

import fs from 'node:fs';
import * as NodeRuntime from '@effect/platform-node/NodeRuntime';
import * as NodeServices from '@effect/platform-node/NodeServices';
import { Effect, Layer, Schema } from 'effect';
import { Command } from 'effect/cli';
import { FetchHttpClient, HttpClient, HttpClientRequest } from 'effect/http';
import type { ChildProcessSpawner } from 'effect/process';
import { type CloudTarget, cloudTarget, hostBoxes } from '../cli/cloud.ts';
import { CliError, githubToken, pollUntil } from '../cli/run.ts';
import { BoxList, BoxState } from '../shared/contracts.ts';
import { BOX_CLI, boxWorker, DOMAIN, detached, OIDC_AUDIENCE } from '../shared/names.ts';

const REPO = process.env.GITHUB_REPOSITORY ?? 'novuhq/novu';
const LABEL = 'box';
const MAX_BOXES = 30;
// The longest an apply may take: a full one (install, every build) takes about 6 minutes.
const APPLY_MINUTES = 20;
// How long the box may take to pass its doctor after an apply restarted its apps.
const SETTLE_SECONDS = 3 * 60;
const MARK = '<!-- novu-box -->';
// The laptop CLI, as a PR comment tells people to run it from the repository (after `npm ci` in docker/box).
const CLI = 'node docker/box/src/cli/main.ts';
const RUN_URL =
  process.env.GITHUB_RUN_ID && `${process.env.GITHUB_SERVER_URL}/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const started = Date.now();
// Every wait ends by then, so the run can still say why in the comment: 5 minutes before the job's timeout-minutes
// (60, .github/workflows/novu-box.yml) ends it. The worst case (a save to wait out, a bake, a full apply) takes longer.
const DEADLINE = started + 55 * 60_000;

type Services = HttpClient.HttpClient | ChildProcessSpawner.ChildProcessSpawner;

function log(message: string): void {
  console.error(`[box] ${message}`);
}

const Label = Schema.Struct({ name: Schema.String });
const PullRequestEvent = Schema.Struct({
  action: Schema.String,
  number: Schema.Number,
  sender: Schema.optional(Schema.Struct({ login: Schema.String })),
  label: Schema.optional(Label),
  pull_request: Schema.Struct({
    state: Schema.String,
    labels: Schema.Array(Label),
    head: Schema.Struct({ sha: Schema.String }),
  }),
});
type PullRequestEvent = typeof PullRequestEvent.Type;
const Comment = Schema.Struct({ id: Schema.Number, body: Schema.optional(Schema.NullOr(Schema.String)) });
const IssueEvent = Schema.Struct({
  event: Schema.String,
  label: Schema.optional(Label),
  actor: Schema.optional(Schema.NullOr(Schema.Struct({ login: Schema.String }))),
});
const Pull = Schema.Struct({ state: Schema.String, labels: Schema.Array(Label) });

const decode =
  <S extends Schema.Top & { readonly DecodingServices: never }>(schema: S, what: string) =>
  (input: unknown) =>
    Schema.decodeUnknownEffect(schema)(input).pipe(
      Effect.mapError((error) => new CliError({ message: `${what}: ${error.message}` }))
    );

// --- tokens ---

// What the host and the boxes accept from this run (shared/auth.ts): the workflow's OIDC token, fetched again a
// minute before it expires; run by hand, the GitHub token.
let oidc: { readonly value: string; readonly exp: number } | undefined;

const boxToken = Effect.suspend((): Effect.Effect<string, CliError, Services> => {
  const { ACTIONS_ID_TOKEN_REQUEST_URL: url, ACTIONS_ID_TOKEN_REQUEST_TOKEN: requestToken = '' } = process.env;
  if (!url) return githubToken;
  if (oidc && oidc.exp - 60 > Date.now() / 1000) return Effect.succeed(oidc.value);

  return Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const response = yield* client
      .execute(
        HttpClientRequest.get(`${url}&audience=${OIDC_AUDIENCE}`).pipe(HttpClientRequest.bearerToken(requestToken))
      )
      .pipe(Effect.mapError((error) => new CliError({ message: `the OIDC token request: ${error.message}` })));
    if (response.status !== 200)
      return yield* new CliError({
        message: `the OIDC token request answered ${response.status}; the job needs id-token: write`,
      });
    const { value } = yield* Effect.flatMap(
      Effect.orElseSucceed(response.json, () => null),
      decode(Schema.Struct({ value: Schema.String }), 'the OIDC token')
    );
    const [, payload = ''] = value.split('.');
    oidc = { value, exp: JSON.parse(Buffer.from(payload, 'base64url').toString()).exp };

    return value;
  });
});

// The box's cloud target, signed in with boxToken; it never deploys the host, and no wait runs past DEADLINE.
const target = (box: string) =>
  Effect.gen(function* () {
    const services = yield* Effect.context<Services>();

    return yield* cloudTarget({
      box,
      token: Effect.provide(boxToken, services),
      mayDeployHost: false,
      deadline: DEADLINE,
    });
  });

const hostList = Effect.gen(function* () {
  const services = yield* Effect.context<Services>();

  return (yield* hostBoxes('boxes', BoxList, { token: Effect.provide(boxToken, services) })).boxes;
});

// --- GitHub ---

const github = Effect.fn('github')(function* (
  path: string,
  { method = 'GET', body }: { readonly method?: 'GET' | 'POST' | 'PATCH'; readonly body?: unknown } = {}
) {
  const client = yield* HttpClient.HttpClient;
  let request = HttpClientRequest.make(method)(`https://api.github.com${path}`).pipe(
    HttpClientRequest.bearerToken(yield* githubToken),
    HttpClientRequest.setHeaders({ Accept: 'application/vnd.github+json', 'User-Agent': 'novu-box' })
  );
  if (body) request = HttpClientRequest.bodyJsonUnsafe(request, body);
  const what = `GitHub ${method} ${path}`;
  const response = yield* client
    .execute(request)
    .pipe(Effect.mapError((error) => new CliError({ message: `${what}: ${error.message}` })));
  if (response.status < 200 || response.status >= 300) {
    const text = yield* Effect.orElseSucceed(response.text, () => '');
    return yield* new CliError({ message: `${what} -> ${response.status}: ${text.slice(0, 200)}` });
  }

  return yield* response.json.pipe(Effect.mapError((error) => new CliError({ message: `${what}: ${error.message}` })));
});

const everyPage = Effect.fn('everyPage')(function* <S extends Schema.Top & { readonly DecodingServices: never }>(
  path: string,
  item: S
) {
  const items: Array<S['Type']> = [];
  for (let page = 1; ; page++) {
    const batch = yield* Effect.flatMap(
      github(`${path}?per_page=100&page=${page}`),
      decode(Schema.Array(item), `GitHub ${path}`)
    );
    items.push(...batch);
    if (batch.length < 100) return items;
  }
});

// The one comment the box keeps on its PR, edited in place. `onlyUpdate`: say nothing on a PR that has none.
const commentIds = new Map<number, number | undefined>();

const comment = Effect.fn('comment')(function* (
  number: number,
  body: string,
  { onlyUpdate = false }: { readonly onlyUpdate?: boolean } = {}
) {
  console.log(`comment on #${number}:\n${body}`);
  if (!commentIds.has(number)) {
    const existing = (yield* everyPage(`/repos/${REPO}/issues/${number}/comments`, Comment)).find((item) =>
      item.body?.startsWith(MARK)
    );
    commentIds.set(number, existing?.id);
  }
  const id = commentIds.get(number);
  const payload = { body: `${MARK}\n${body}` };
  if (id) yield* github(`/repos/${REPO}/issues/comments/${id}`, { method: 'PATCH', body: payload });
  else if (!onlyUpdate) {
    const created = yield* github(`/repos/${REPO}/issues/${number}/comments`, { method: 'POST', body: payload });
    commentIds.set(number, (yield* decode(Comment, 'the new comment')(created)).id);
  }
});

// Who added the `box` label: the sender of a `labeled` event, else whoever labeled the PR last.
const labeler = Effect.fn('labeler')(function* (event: PullRequestEvent) {
  if (event.action === 'labeled') return event.sender?.login;
  const events = yield* everyPage(`/repos/${REPO}/issues/${event.number}/events`, IssueEvent);

  return events.filter((item) => item.event === 'labeled' && item.label?.name === LABEL).at(-1)?.actor?.login;
});

// Write, maintain or admin on the repository (GitHub reports maintain as `write`).
const canWrite = Effect.fn('canWrite')(function* (login: string | undefined) {
  if (!login) return false;
  const { permission } = yield* github(`/repos/${REPO}/collaborators/${encodeURIComponent(login)}/permission`).pipe(
    Effect.flatMap(decode(Schema.Struct({ permission: Schema.String }), 'the permission')),
    Effect.catchIf(
      (error) => /-> 404:/.test(error.message),
      () => Effect.succeed({ permission: 'none' })
    )
  );

  return permission === 'admin' || permission === 'write';
});

// --- pr ---

const pr = Effect.gen(function* () {
  const event = yield* decode(
    Schema.fromJsonString(PullRequestEvent),
    'the pull_request event'
  )(fs.readFileSync(process.env.GITHUB_EVENT_PATH ?? '', 'utf8'));
  const { action, number, pull_request: pull } = event;
  const labeled = pull.labels.some((label) => label.name === LABEL);
  if (['labeled', 'unlabeled'].includes(action) ? event.label?.name !== LABEL : !labeled && action !== 'closed') {
    log(`#${number} ${action}: nothing for the box to do`);

    return 0;
  }
  const box = `pr-${number}`;
  if (action === 'closed' || action === 'unlabeled') {
    yield* (yield* target(box)).delete;
    const why = action === 'closed' ? 'the PR was closed' : `\`${LABEL}\` was removed`;
    yield* comment(number, `🗑️ Novu Box \`${box}\` deleted: ${why}.`, { onlyUpdate: true });

    return 0;
  }
  if (pull.state !== 'open') {
    log(`#${number} ${action}: the PR is ${pull.state}`);

    return 0;
  }
  const by = yield* labeler(event);
  if (!(yield* canWrite(by))) {
    yield* comment(
      number,
      `🚫 No Novu Box: ${by ? `@${by}` : 'whoever'} added \`${LABEL}\` without write access to ${REPO}. While we battle-test boxes, only Novu members with write access can start one.`
    );

    return 0;
  }

  return yield* applyHead(number, pull.head.sha);
});

const applyHead = Effect.fn('applyHead')(function* (number: number, sha: string) {
  const box = `pr-${number}`;
  const short = sha.slice(0, 10);
  const origin = `https://${boxWorker(box)}.${DOMAIN}`;
  const runLink = RUN_URL ? ` ([log](${RUN_URL}))` : '';
  const cloud = yield* target(box);
  yield* comment(number, `⏳ Applying \`${short}\` to Novu Box \`${box}\`…${runLink}`);

  return yield* Effect.gen(function* () {
    const phase = (yield* cloud.state)?.phase ?? 'new';
    // Never started, created by a run cancelled before the box first came up, its bake failed, or its snapshot is lost.
    if (phase === 'new' || phase === 'lost') {
      const others = (yield* hostList).filter((name) => /^pr-\d+$/.test(name) && name !== box);
      if (others.length >= MAX_BOXES) {
        yield* comment(
          number,
          `⏸️ No Novu Box: ${others.length} PR boxes exist, and ${MAX_BOXES} is the most at once. Remove \`${LABEL}\` from a PR you're done with, then remove and add \`${LABEL}\` here again.`
        );

        return 0;
      }
      yield* cloud.up({ fromBase: true });
    } else {
      // Waits out a save; a box that runs answers its doctor, whatever the doctor finds.
      yield* cloud.readyFor({ reachable: true });
      yield* stopApply(cloud);
    }
    const plan = yield* apply(cloud, sha);
    const report = yield* cloud.settled(Math.min(SETTLE_SECONDS, (DEADLINE - Date.now()) / 1000));
    const seconds = Math.round((Date.now() - started) / 1000);
    const problems = report?.ok ? [] : (report?.problems ?? ['the box gave no doctor report']);
    yield* comment(
      number,
      [
        problems.length
          ? `⚠️ Novu Box applied \`${short}\` but isn't healthy: ${origin} (${plan}, took ${seconds} s)`
          : `✅ Novu Box ready: ${origin} (applied \`${short}\`, ${plan}, took ${seconds} s)`,
        ...(problems.length
          ? ['', `Problems (\`${CLI} doctor --cloud --box ${box}\`):`, ...problems.map((problem) => `- ${problem}`)]
          : []),
        '',
        `- Mailpit: ${origin}/mail`,
        `- Sign in as \`agent@novu.co\` with the Novu Box seed password from the password manager, or sign up with your own \`@novu.co\` address.`,
        `- Every push applies the new head here. The box sleeps after an hour without requests and wakes on the next one (about 40 s). Removing \`${LABEL}\` or closing the PR deletes it.`,
        `- Logs: \`${CLI} logs --cloud --box ${box}\``,
      ].join('\n')
    );

    return 0;
  }).pipe(
    Effect.catch((error) =>
      Effect.gen(function* () {
        log(`ERROR: ${error.message}`);
        const where = error.log ? `; the apply's log: \`${CLI} exec --cloud --box ${box} -- cat ${error.log}\`` : '';
        const [first = ''] = error.message.split('\n');
        yield* comment(
          number,
          `❌ Novu Box failed on \`${short}\`: ${first.slice(0, 400)}\n\nLog: ${RUN_URL ?? 'this run'}${where}`
        );

        return 1;
      })
    )
  );
});

// A newer push cancels the run of the older one, but not that run's apply, which goes on in the box.
const stopApply = Effect.fn('stopApply')(function* (cloud: CloudTarget) {
  const stopped = yield* cloud.boxOutput(['stop-apply']);
  if (stopped) log(stopped);
});

// `box apply <sha>` detached in the box: it outlives this run when a newer push cancels it, and a stream that long
// would break (over 5 minutes, README). This waits while it holds the box's lock, then reads its log and the box's
// state. Returns its plan line.
const apply = Effect.fn('apply')(function* (cloud: CloudTarget, sha: string) {
  const file = `/data/logs/apply-${sha.slice(0, 12)}.log`;
  const fail = (message: string) => new CliError({ message, log: file });
  const boxState = decode(Schema.fromJsonString(BoxState), '`box state`');
  log(`applying ${sha}; the box logs it to ${file}`);
  yield* cloud.runOutput(detached([...BOX_CLI, 'apply', sha], file), { github: true });
  const deadline = Math.min(Date.now() + APPLY_MINUTES * 60_000, DEADLINE);
  let lastSeen = Date.now();
  const applying = cloud.runOutput(['sh', '-c', `${BOX_CLI.join(' ')} state && tail -n 1 "$0"`, file]).pipe(
    Effect.flatMap((text) => {
      lastSeen = Date.now();
      const [stateLine = '', ...last] = text.split('\n');

      return Effect.map(boxState(stateLine), (state) => {
        const still = state.lock?.command === 'apply';
        if (still) log(`still applying: ${last.join(' ').slice(0, 200)}`);

        return still;
      });
    }),
    Effect.catch((error) =>
      Date.now() - lastSeen > 3 * 60_000
        ? Effect.fail(fail(`the box stopped answering: ${error.message}`))
        : Effect.succeed(true)
    )
  );
  const ended = Effect.gen(function* () {
    if (!(yield* applying)) return true;
    if (Date.now() > deadline)
      return yield* fail(
        deadline === DEADLINE
          ? "the job's time ran out during the apply"
          : `the apply runs for over ${APPLY_MINUTES} minutes`
      );

    return undefined;
  });
  yield* Effect.sleep('10 seconds');
  yield* pollUntil(ended, { every: '10 seconds', until: Number.POSITIVE_INFINITY, orElse: Effect.succeed(true) });
  const output = yield* cloud.runOutput(['cat', file]);
  console.log(output);
  const { applied, applying: unfinished } = yield* boxState(yield* cloud.boxOutput(['state']));
  if (applied?.head !== sha || unfinished)
    return yield* fail(output.match(/ERROR: .*$/gm)?.at(-1) ?? `the apply ended without applying ${sha.slice(0, 10)}`);

  return output.match(/plan: .*$/gm)?.at(-1) ?? 'plan: nothing';
});

// --- schedules ---

const cleanup = Effect.gen(function* () {
  let failed = 0;
  for (const box of (yield* hostList).filter((name) => /^pr-\d+$/.test(name))) {
    const number = Number(box.slice(3));
    yield* Effect.gen(function* () {
      const pull = yield* github(`/repos/${REPO}/pulls/${number}`).pipe(
        Effect.flatMap(decode(Pull, `PR #${number}`)),
        Effect.catchIf(
          (error) => /-> 404:/.test(error.message),
          () => Effect.succeed(null)
        )
      );
      if (pull?.state === 'open' && pull.labels.some((label) => label.name === LABEL)) return;
      const why = !pull ? 'missing' : pull.state !== 'open' ? pull.state : `not labeled \`${LABEL}\``;
      log(`${box}: the PR is ${why}`);
      yield* (yield* target(box)).delete;
      if (pull)
        yield* comment(
          number,
          `🗑️ Novu Box \`${box}\` deleted by the nightly cleanup: the PR is closed or no longer labeled \`${LABEL}\`.`,
          { onlyUpdate: true }
        );
    }).pipe(
      Effect.catch((error) =>
        Effect.sync(() => {
          log(`ERROR: ${box}: ${error.message}`);
          failed++;
        })
      )
    );
  }

  return failed ? 1 : 0;
});

// Deletes base and bakes it from next, then saves it, which also gives it a snapshot younger than Cloudflare's
// 30 days. Until it's back (about 20 minutes), a new PR box bakes next itself.
const rebake = Effect.gen(function* () {
  const base = yield* target('base');
  yield* base.delete;
  yield* base.up({ ref: 'next' });

  return yield* base.down;
});

const exitWith = (effect: Effect.Effect<number, CliError, Services>) =>
  effect.pipe(
    Effect.catchTag('CliError', (error) =>
      Effect.sync(() => {
        log(`ERROR: ${error.message}`);

        return 1;
      })
    ),
    Effect.map((code) => {
      process.exitCode = code;
    })
  );

const ci = Command.make('ci').pipe(
  Command.withSubcommands([
    Command.make('pr', {}, () => exitWith(pr)).pipe(Command.withDescription("the pull_request event's box")),
    Command.make('cleanup', {}, () => exitWith(cleanup)).pipe(Command.withDescription('delete stale pr-* boxes')),
    Command.make('rebake', {}, () => exitWith(rebake)).pipe(Command.withDescription('bake base again from next')),
  ])
);

Command.run(ci, { version: '1' }).pipe(
  Effect.provide(Layer.mergeAll(NodeServices.layer, FetchHttpClient.layer)),
  NodeRuntime.runMain
);
