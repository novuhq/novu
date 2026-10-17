// What crosses a boundary, decoded where it comes in. Objects keep only the fields the box reads.

import * as z from 'zod';

// `schema`, from JSON text.
export function fromJson<T extends z.ZodType>(schema: T) {
  return z
    .string()
    .transform((text, context) => {
      try {
        return JSON.parse(text);
      } catch {
        context.addIssue({ code: 'custom', message: `not JSON: ${text.slice(0, 200)}` });

        return z.NEVER;
      }
    })
    .pipe(schema);
}

// JSON `text` as `schema` says, or a failure that starts with `what`.
export function decode<T extends z.ZodType>(schema: T, text: string, what: string): z.output<T> {
  const decoded = fromJson(schema).safeParse(text);
  if (!decoded.success) throw new Error(`${what}: ${z.prettifyError(decoded.error)}`);

  return decoded.data;
}

// --- The box's files under /data, and what `box state` and `box doctor` print ---

export const Baked = z.object({ ref: z.string(), sha: z.string(), at: z.string() });
export type Baked = z.infer<typeof Baked>;

// The last apply that finished; `files`: how many changed.
export const Applied = z.object({
  ref: z.string(),
  source: z.enum(['github', 'sync']),
  head: z.string(),
  sha: z.string(),
  base: z.string(),
  files: z.number(),
  full: z.boolean(),
  at: z.string(),
});
export type Applied = z.infer<typeof Applied>;

// Written before an apply checks out its commit, removed when it succeeds; the next apply plans for these files too.
export const Applying = z.object({ sha: z.string(), files: z.array(z.string()), full: z.boolean(), at: z.string() });
export type Applying = z.infer<typeof Applying>;

export const LockHolder = z.object({ pid: z.number(), command: z.string(), at: z.string() });
export type LockHolder = z.infer<typeof LockHolder>;

export const BoxState = z.object({
  baked: Baked.nullable(),
  applied: Applied.nullable(),
  applying: Applying.nullable(),
  lock: LockHolder.nullable(),
});
export type BoxState = z.infer<typeof BoxState>;

export const DoctorReport = z.object({
  ok: z.boolean(),
  problems: z.array(z.string()),
  baked: Baked.nullable(),
  applied: Applied.nullable(),
  lock: LockHolder.nullable(),
  http: z.record(z.string(), z.number()),
  processes: z.array(
    z.object({ name: z.string(), status: z.string(), ready: z.string(), exitCode: z.number(), restarts: z.number() })
  ),
});
export type DoctorReport = z.infer<typeof DoctorReport>;

// One row of `process-compose process list -o json`.
export const PcProcesses = z.array(
  z.object({
    name: z.string(),
    status: z.string(),
    is_ready: z.string(),
    is_running: z.boolean(),
    exit_code: z.number(),
    restarts: z.number(),
  })
);
export type PcProcess = z.infer<typeof PcProcesses>[number];

// A line of process-compose's log, and an app's JSON log line inside its `message`: fields that aren't what `box
// logs` expects are left out rather than failing the line.
export const PcLogLine = z.object({
  process: z.string().optional().catch(undefined),
  message: z.unknown(),
  level: z.string().optional().catch(undefined),
});
const text = z.string().optional().catch(undefined);
export const AppLogLine = z.object({
  level: z.union([z.number(), z.string()]),
  msg: z.unknown(),
  err: z.object({ message: text }).optional().catch(undefined),
  error: z
    .union([z.string(), z.object({ message: text })])
    .optional()
    .catch(undefined),
  context: text,
  logger: text,
});

// --- The checkout's own JSON ---

export const PackageJson = z.object({
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
  optionalDependencies: z.record(z.string(), z.string()).optional(),
});
export const NxGraph = z.object({
  graph: z.object({
    nodes: z.record(
      z.string(),
      z.object({ data: z.object({ root: z.string(), targets: z.record(z.string(), z.unknown()).optional() }) })
    ),
    dependencies: z.record(z.string(), z.array(z.object({ target: z.string() }))),
  }),
});
export const NxProjects = z.array(z.string());
export const PnpmPackages = z.array(z.object({ name: z.string(), path: z.string() }));
export const NestConfig = z.looseObject({ compilerOptions: z.looseObject({}) });

// --- The host's /__box/* routes ---

const Note = z.object({ at: z.string(), message: z.string() });
// A `down` that waits to save, or tries again.
const Down = z.object({ tries: z.number() }).nullable();
const Status = {
  since: z.string().nullable(),
  running: z.boolean(),
  snapshot: z.object({ id: z.string(), name: z.string().optional(), gigabytes: z.number().nullable() }).nullable(),
  lastActivity: z.string(),
  origin: z.string().nullish(),
};
export const BoxStatus = z.discriminatedUnion('phase', [
  z.object({ ...Status, phase: z.literal(['new', 'asleep']), error: Note.nullable() }),
  z.object({ ...Status, phase: z.literal(['baking', 'saving']), down: Down }),
  z.object({ ...Status, phase: z.literal('running'), down: Down, saveFailed: Note.nullable() }),
  z.object({ ...Status, phase: z.literal('lost'), lost: Note.extend({ id: z.string() }) }),
]);
export type BoxStatus = z.infer<typeof BoxStatus>;
export type Phase = BoxStatus['phase'];

// A box with nothing to wake: never baked, its bake failed, or its snapshot is lost.
export function needsBake(status: BoxStatus): boolean {
  return status.phase === 'new' || status.phase === 'lost';
}

export const ExecRequest = z.object({
  cmd: z.array(z.string()).min(1),
  cwd: z.string().optional(),
  github: z.boolean().optional(),
});
export type ExecRequest = z.infer<typeof ExecRequest>;

export const StateAnswer = z.object({ state: z.string(), ref: z.string().optional(), snapshot: z.string().optional() });
export type StateAnswer = z.infer<typeof StateAnswer>;

export const BoxList = z.object({ boxes: z.array(z.string()) });

// --- Cloudflare and GitHub ---

export const CloudflareAnswer = z.object({ success: z.boolean(), errors: z.unknown(), result: z.unknown() });
export const ScriptList = z.array(z.object({ id: z.string() }));

export const CheckRuns = z.object({
  check_runs: z.array(z.object({ status: z.string(), conclusion: z.string().nullable(), html_url: z.string() })),
});
const Label = z.object({ name: z.string() });
export const PullRequestEvent = z.object({
  action: z.string(),
  number: z.number(),
  sender: z.object({ login: z.string() }).optional(),
  label: Label.optional(),
  pull_request: z.object({ state: z.string(), labels: z.array(Label), head: z.object({ sha: z.string() }) }),
});
export type PullRequestEvent = z.infer<typeof PullRequestEvent>;
export const Pull = z.object({ state: z.string(), labels: z.array(Label) });
export const IssueComment = z.object({ id: z.number(), body: z.string().nullish() });
export const IssueEvent = z.object({
  event: z.string(),
  label: Label.optional(),
  actor: z.object({ login: z.string() }).nullish(),
});
export const Permission = z.object({ permission: z.string() });
export const OidcToken = z.object({ value: z.string() });

// --- What the bake and start read from Clerk, Stripe, the box's own API and the bridge app ---

// A Clerk or Stripe object.
export const WithId = z.object({ id: z.string() });
export type WithId = z.infer<typeof WithId>;
export const ClerkUsers = z.array(WithId);
export const ClerkMemberships = z.object({
  data: z.array(z.object({ organization: WithId.extend({ name: z.string() }) })),
});
export const ClerkToken = z.object({ jwt: z.string() });

const data = <T extends z.ZodType>(schema: T) => z.object({ data: schema });
const ApiId = z.object({ _id: z.string() });
export const ApiOrganization = data(ApiId.extend({ name: z.string() }));
export const ApiUser = data(ApiId.extend({ email: z.string(), firstName: z.string(), lastName: z.string() }));
export const ApiEnvironments = data(
  z.array(ApiId.extend({ name: z.string(), apiKeys: z.array(z.object({ key: z.string() })) }))
);
export const ApiEnvironment = data(ApiId);
export const ApiCreated = data(ApiId);
export const ApiIntegrations = data(z.array(ApiId.extend({ providerId: z.string(), _environmentId: z.string() })));
export const ApiSubscription = data(z.object({ apiServiceLevel: z.string().nullish(), status: z.string().nullish() }));
export const ApiSynced = data(z.array(z.unknown()));
export const BridgeDiscovery = z.object({ agents: z.array(z.object({ agentId: z.string() })).default([]) });

const Usage = z.object({ recurring: z.object({ usage_type: z.string() }) });
export const StripeCustomers = data(
  z.array(
    WithId.extend({
      metadata: z.record(z.string(), z.string()),
      subscriptions: data(z.array(WithId.extend({ items: data(z.array(WithId.extend({ price: Usage }))) }))).optional(),
    })
  )
);
export const StripePrices = data(z.array(WithId.extend(Usage.shape)));

// --- The sink: whatever a Novu HTTP provider sent, and Mailpit's answer to it ---

export const ProviderRequest = z.record(z.string(), z.unknown());
export const MailpitSent = z.object({ ID: z.string() });

// --- Mailpit, through `box mail` ---

const Address = z.object({ Name: z.string().optional(), Address: z.string() });
const Addresses = z.array(Address).nullish();
export type MailAddress = z.infer<typeof Address>;
const Mail = z.object({ ID: z.string(), To: Addresses, Subject: z.string(), Tags: z.array(z.string()).nullish() });
export const MailList = z.object({
  messages: z.array(Mail.extend({ Created: z.string() })),
  messages_count: z.number().optional(),
  total: z.number().optional(),
});
export const MailMessage = Mail.extend({
  Date: z.string(),
  From: Address.nullish(),
  Cc: Addresses,
  HTML: z.string(),
  Text: z.string(),
  Attachments: z.array(z.object({ FileName: z.string(), ContentType: z.string(), Size: z.number() })).nullish(),
});
export const HtmlCheck = z.object({
  Total: z.object({ Supported: z.number(), Partial: z.number(), Unsupported: z.number(), Tests: z.number() }),
  Warnings: z
    .array(
      z.object({
        Title: z.string(),
        URL: z.string(),
        Score: z.object({ Found: z.number() }),
        Results: z.array(z.object({ Family: z.string(), Platform: z.string(), Support: z.string() })),
      })
    )
    .nullish(),
});
export const LinkCheck = z.object({
  Errors: z.number(),
  Links: z.array(z.object({ URL: z.string(), StatusCode: z.number(), Status: z.string().optional() })),
});
