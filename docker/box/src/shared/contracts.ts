import * as z from 'zod';

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

export function decode<T extends z.ZodType>(schema: T, text: string, what: string): z.output<T> {
  const decoded = fromJson(schema).safeParse(text);
  if (!decoded.success) throw new Error(`${what}: ${z.prettifyError(decoded.error)}`);

  return decoded.data;
}

export const Baked = z.object({ ref: z.string(), sha: z.string(), at: z.string() });
export type Baked = z.infer<typeof Baked>;

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

export const PackageJson = z.object({
  scripts: z.record(z.string(), z.string()).optional(),
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

const Note = z.object({ at: z.string(), message: z.string() });
const Down = z.object({ tries: z.number() }).nullable();
// The last snapshot restore: `colo` is the Box object's Cloudflare location, `container` its container's, each
// absent if it couldn't be looked up.
export const LastStart = z.object({
  at: z.string(),
  snapshot: z.string(),
  ms: z.number(),
  colo: z.string().optional(),
  container: z.string().optional(),
});
export type LastStart = z.infer<typeof LastStart>;
// `placed: false` when base exists but couldn't make the box's first call (see `Box.introduce`).
export const RegisteredBox = z.object({
  box: z.string(),
  origin: z.string(),
  placed: z.boolean().optional(),
  warning: z.string().optional(),
});
const Status = {
  since: z.string().nullable(),
  running: z.boolean(),
  snapshot: z.object({ id: z.string(), name: z.string().optional(), gigabytes: z.number().nullable() }).nullable(),
  lastActivity: z.string(),
  origin: z.string().nullish(),
  lastStart: LastStart.optional(),
};
export const BoxStatus = z.discriminatedUnion('phase', [
  z.object({ ...Status, phase: z.literal(['new', 'asleep']), error: Note.nullable() }),
  z.object({ ...Status, phase: z.literal(['baking', 'saving']), down: Down }),
  z.object({ ...Status, phase: z.literal('running'), down: Down, saveFailed: Note.nullable() }),
  z.object({ ...Status, phase: z.literal('lost'), lost: Note.extend({ id: z.string() }) }),
]);
export type BoxStatus = z.infer<typeof BoxStatus>;
export type Phase = BoxStatus['phase'];

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

export const CheckRuns = z.object({
  check_runs: z.array(z.object({ status: z.string(), conclusion: z.string().nullable(), html_url: z.string() })),
});
const Label = z.object({ name: z.string() });
export const PullRequestEvent = z.object({
  action: z.string(),
  number: z.number(),
  sender: z.object({ login: z.string() }).optional(),
  label: Label.optional(),
  pull_request: z.object({
    state: z.string(),
    title: z.string(),
    body: z.string().nullish(),
    labels: z.array(Label),
    base: z.object({ ref: z.string() }),
    head: z.object({ sha: z.string(), ref: z.string() }),
  }),
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

export const WithId = z.object({ id: z.string() });
export type WithId = z.infer<typeof WithId>;
export const ClerkUsers = z.array(WithId);
export const ClerkMemberships = z.object({
  data: z.array(z.object({ organization: WithId.extend({ name: z.string() }) })),
});
export const ClerkToken = z.object({ jwt: z.string() });
export const ClerkUser = WithId.extend({
  created_at: z.number(),
  email_addresses: z.array(z.object({ email_address: z.string() })),
});
export type ClerkUser = z.infer<typeof ClerkUser>;
export const ClerkUserList = z.array(ClerkUser);

const TestUser = z.object({ email: z.string(), box: z.string(), createdAt: z.string(), live: z.boolean() });
export const TestUsers = z.object({ users: z.array(TestUser), prune: z.array(z.string()) });
export const CreatedTestUser = z.object({ email: z.string(), password: z.string(), pruned: z.array(z.string()) });
export const DeletedBox = z.object({ users: z.array(z.string()).default([]), usersError: z.string().optional() });

const TesterArmyPullRequest = z.object({
  number: z.number(),
  title: z.string(),
  description: z.string().optional(),
  baseBranch: z.string(),
  headBranch: z.string(),
  commitSha: z.string(),
});
export type TesterArmyPullRequest = z.infer<typeof TesterArmyPullRequest>;
// A PR box gets the exploration agent and PR smoke; `full` starts the Full groups (the nightly box of next). The PR
// shape has no `suite`: PR branches send it with their own ci.ts.
export const TesterArmyStart = z.union([
  z.object({ pullRequest: TesterArmyPullRequest }),
  z.object({ suite: z.literal('full') }),
]);
export type TesterArmyStart = z.infer<typeof TesterArmyStart>;
const StartedGroups = z.array(z.object({ name: z.string(), batchId: z.string(), runs: z.number() }));
export const TesterArmyStarted = z.object({
  exploration: z.object({ status: z.string(), runId: z.string() }),
  groups: StartedGroups,
  signUpUsersDeleted: z.array(z.string()),
});
export const TesterArmyFullStarted = z.object({ groups: StartedGroups, signUpUsersDeleted: z.array(z.string()) });

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

export const ProviderRequest = z.record(z.string(), z.unknown());
export const MailpitSent = z.object({ ID: z.string() });

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
