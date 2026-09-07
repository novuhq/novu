/**
 * Ordered descriptor of every step in the agent-turn flow simulator.
 *
 * Single source of truth: the SVG diagram in `flow-diagram.tsx` and the
 * stepper inside `flow-simulator.tsx` both consume this array so the diagram
 * and the textual narrative can never disagree. Adding/removing/reordering a
 * step requires no changes outside this file plus the state-machine mapping
 * in the simulator.
 */

export type FlowLane = 'user' | 'channel' | 'novu' | 'runtime' | 'mcp';

/**
 * `hit`  -> step is part of the vault-hit branch (active when stored token works).
 * `miss` -> step is part of the vault-miss branch (active when DCR + OAuth is needed).
 * undefined -> step is on the common path (always rendered active when reached).
 */
export type FlowBranch = 'hit' | 'miss';

export interface FlowStep {
  /** Stable identifier referenced from the simulator state machine. */
  id: string;
  /** One-line headline shown in the diagram tooltip + stepper. */
  label: string;
  /** Short note rendered under the label in the stepper. Markdown not parsed. */
  note?: string;
  /**
   * Sequence-diagram source lane. For internal "thinking" steps where no
   * message crosses lanes (e.g. token lookup inside the runtime), set
   * `source === target`.
   */
  source: FlowLane;
  /**
   * Sequence-diagram target lane. Defaults to `source` (no arrow) when omitted.
   */
  target?: FlowLane;
  /** Set when the step only belongs to one branch of the flow. */
  branch?: FlowBranch;
}

export const FLOW_LANES: { id: FlowLane; label: string; sublabel?: string }[] = [
  { id: 'user', label: 'User' },
  { id: 'channel', label: 'Channel', sublabel: 'Slack / Email / …' },
  { id: 'novu', label: 'Novu API' },
  { id: 'runtime', label: 'Runtime', sublabel: 'Claude / managed' },
  { id: 'mcp', label: 'MCP + Auth', sublabel: 'mcp.sentry.dev / …' },
];

/**
 * 14 steps total: 4 common preamble, 3 hit-branch, 6 miss-branch, 1 common epilogue.
 * The hit and miss branches each end with "MCP returns data" so the stepper can
 * unify them under a single epilogue step (`user-receives`).
 */
export const FLOW_STEPS: FlowStep[] = [
  // ── Common preamble ────────────────────────────────────────────────────────
  {
    id: 'user-sends',
    label: 'End user sends a message',
    note: 'Subscriber asks the agent something that needs upstream data (e.g. "summarize this week\'s Sentry issues").',
    source: 'user',
    target: 'channel',
  },
  {
    id: 'novu-receives',
    label: 'Novu API receives the turn',
    note: 'Channel adapter normalizes the inbound message and routes it to the agent runtime.',
    source: 'channel',
    target: 'novu',
  },
  {
    id: 'runtime-handles',
    label: 'Managed runtime takes the turn',
    note: 'Novu forwards user message + agent config to the provider (e.g. Anthropic).',
    source: 'novu',
    target: 'runtime',
  },
  {
    id: 'runtime-checks-token',
    label: 'Runtime attempts MCP initialise',
    note: 'Managed provider tries to initialise each enabled MCP server before streaming the turn. Branches on whether a credential exists in the runtime vault (or, when tokenVault is false, whether the upstream MCP accepts the call).',
    source: 'runtime',
  },
  // ── Hit branch ─────────────────────────────────────────────────────────────
  {
    id: 'mcp-call-hit',
    label: 'Runtime calls MCP with the stored credential',
    note: 'Credential lives either in the runtime vault (tokenVault: true) or is read from mcp_connection.auth and injected by Novu. Either way the MCP initialise succeeds.',
    source: 'runtime',
    target: 'mcp',
    branch: 'hit',
  },
  {
    id: 'mcp-data-hit',
    label: 'MCP returns the requested data',
    note: 'Runtime continues the agent turn with the data in hand. No OAuth was needed.',
    source: 'mcp',
    target: 'runtime',
    branch: 'hit',
  },
  // ── Miss branch ────────────────────────────────────────────────────────────
  {
    id: 'runtime-needs-oauth',
    label: 'Runtime surfaces "MCP init failed"',
    note: 'Managed agents gate dispatch before the provider runs: pending OAuth MCPs post an in-thread setup card and park the turn on the conversation.',
    source: 'runtime',
    target: 'novu',
    branch: 'miss',
  },
  {
    id: 'novu-dcr',
    label: 'Novu mints a Connect URL + posts a card',
    note: 'Worker calls POST /v1/agents/:id/mcp-servers/:mcpId/oauth/url (discovery + DCR + PKCE) and POST /reply with a card containing a link-button. The failed turn is parked on the mcp_connection row.',
    source: 'novu',
    target: 'channel',
    branch: 'miss',
  },
  {
    id: 'user-authorizes',
    label: 'User clicks the button and completes OAuth',
    note: "Authorize URL opens in a new tab. Upstream MCP redirects to Novu's signed-state callback.",
    source: 'user',
    target: 'mcp',
    branch: 'miss',
  },
  {
    id: 'novu-stores-token',
    label: 'Novu stores the token (and pushes to the runtime vault when capable)',
    note: 'Callback writes encrypted tokens to mcp_connection.auth. If runtime.capabilities.tokenVault is true, the callback also calls IAgentRuntimeProvider.upsertVaultCredential and persists the returned vaultCredentialId.',
    source: 'mcp',
    target: 'novu',
    branch: 'miss',
  },
  {
    id: 'runtime-resumes',
    label: 'User re-sends the message',
    note: 'Sessions are owned by the Cloudflare Durable Object, so Novu cannot auto-replay the turn. The user re-sends after OAuth completes.',
    source: 'novu',
    target: 'runtime',
    branch: 'miss',
  },
  {
    id: 'mcp-call-miss',
    label: 'Runtime re-initialises MCP with the fresh credential',
    note: 'Same MCP initialise call as the hit branch — just after the OAuth detour.',
    source: 'runtime',
    target: 'mcp',
    branch: 'miss',
  },
  {
    id: 'mcp-data-miss',
    label: 'MCP returns the requested data',
    note: 'Turn completes; the user-facing answer can finally be built.',
    source: 'mcp',
    target: 'runtime',
    branch: 'miss',
  },
  // ── Common epilogue ────────────────────────────────────────────────────────
  {
    id: 'user-receives',
    label: "User sees the agent's reply",
    note: 'Both branches converge here.',
    source: 'runtime',
    target: 'user',
  },
];

/** Convenience lookup map. */
export const FLOW_STEP_BY_ID: Record<string, FlowStep> = Object.fromEntries(FLOW_STEPS.map((step) => [step.id, step]));

/**
 * Predicate used by both the diagram and the stepper to render the right
 * subset of steps. `undefined` selectedBranch -> common path only.
 */
export function isStepVisible(step: FlowStep, selectedBranch: FlowBranch | undefined): boolean {
  if (!step.branch) return true;

  return step.branch === selectedBranch;
}
