// Every contract between the parts of Novu Box, as Schemas: the files a box keeps in /data, the JSON its commands
// print, the host's /__box/* bodies and answers, and what the Slack router and boxes send each other. Each side decodes
// at its boundary. Only `effect` core.

import { Schema } from 'effect';

// --- In the box: files under /data and what `box state` and `box doctor` print ---

// /data/.baked.json: the commit the golden /data was baked from.
export const Baked = Schema.Struct({ ref: Schema.String, sha: Schema.String, at: Schema.String });
export type Baked = typeof Baked.Type;

// /data/.applied.json: the last apply that finished. `files`: how many changed; `source`: a GitHub ref or a sync bundle.
export const Applied = Schema.Struct({
  ref: Schema.String,
  source: Schema.Literals(['github', 'sync']),
  head: Schema.String,
  sha: Schema.String,
  base: Schema.String,
  files: Schema.Number,
  full: Schema.Boolean,
  at: Schema.String,
});
export type Applied = typeof Applied.Type;

// /data/.applying.json: written before an apply checks out its commit, removed when it succeeds. The next apply
// plans for these files too (and for everything when `full`).
export const Applying = Schema.Struct({
  sha: Schema.String,
  files: Schema.Array(Schema.String),
  full: Schema.Boolean,
  at: Schema.String,
});
export type Applying = typeof Applying.Type;

// /data/run/box.lock: the one bake or apply that runs.
export const LockHolder = Schema.Struct({ pid: Schema.Number, command: Schema.String, at: Schema.String });
export type LockHolder = typeof LockHolder.Type;

// `box state`
export const BoxState = Schema.Struct({
  baked: Schema.NullOr(Baked),
  applied: Schema.NullOr(Applied),
  applying: Schema.NullOr(Applying),
  lock: Schema.NullOr(LockHolder),
});
export type BoxState = typeof BoxState.Type;

export const ProcessReport = Schema.Struct({
  name: Schema.String,
  status: Schema.String,
  ready: Schema.String,
  exitCode: Schema.Number,
  restarts: Schema.Number,
});

// `box doctor`
export const DoctorReport = Schema.Struct({
  ok: Schema.Boolean,
  problems: Schema.Array(Schema.String),
  baked: Schema.NullOr(Baked),
  applied: Schema.NullOr(Applied),
  http: Schema.Record(Schema.String, Schema.Number),
  processes: Schema.Array(ProcessReport),
});
export type DoctorReport = typeof DoctorReport.Type;

// What an apply does, from the files it changes.
export const ApplyPlan = Schema.Struct({
  install: Schema.Boolean,
  build: Schema.Array(Schema.String),
  enterprise: Schema.Boolean,
  restart: Schema.Array(Schema.String),
});
export type ApplyPlan = typeof ApplyPlan.Type;

// --- The host's /__box/* routes (src/cloud/host.ts, boxes.ts) and their callers (src/cli, src/ci) ---

export const Phase = Schema.Literals(['new', 'baking', 'running', 'saving', 'asleep', 'lost']);
export type Phase = typeof Phase.Type;

export const ErrorNote = Schema.Struct({ at: Schema.String, message: Schema.String });
export const LostNote = Schema.Struct({ id: Schema.String, at: Schema.String, message: Schema.String });

// GET /__box/state. The Slack part (src/cloud/slack/box.ts) adds its own keys, which callers may read loosely.
export const BoxStatus = Schema.Struct({
  phase: Phase,
  since: Schema.NullOr(Schema.String),
  running: Schema.Boolean,
  snapshot: Schema.NullOr(
    Schema.Struct({ id: Schema.String, name: Schema.optional(Schema.String), gigabytes: Schema.NullOr(Schema.Number) })
  ),
  saveTries: Schema.Number,
  error: Schema.NullOr(ErrorNote),
  lost: Schema.NullOr(LostNote),
  lastActivity: Schema.String,
  origin: Schema.optional(Schema.NullOr(Schema.String)),
});
export type BoxStatus = typeof BoxStatus.Type;

// POST /__box/exec
export const ExecRequest = Schema.Struct({
  cmd: Schema.Array(Schema.String),
  cwd: Schema.optional(Schema.String),
  github: Schema.optional(Schema.Boolean),
});
export type ExecRequest = typeof ExecRequest.Type;

// POST /__box/up, /__box/down, /__box/destroy
export const StateAnswer = Schema.Struct({
  state: Schema.String,
  ref: Schema.optional(Schema.String),
  snapshot: Schema.optional(Schema.String),
});
export type StateAnswer = typeof StateAnswer.Type;

// PUT /__box/file
export const FileAnswer = Schema.Struct({ path: Schema.String, exitCode: Schema.Number });

// GET /__box/boxes, PUT and DELETE /__box/boxes/<box>
export const BoxList = Schema.Struct({ boxes: Schema.Array(Schema.String) });
export const BoxCreated = Schema.Struct({ box: Schema.String, origin: Schema.String });
export const BoxDeleted = Schema.Struct({ box: Schema.String, state: Schema.Literal('deleted') });
