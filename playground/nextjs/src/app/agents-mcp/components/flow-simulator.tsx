'use client';

import { AGENT_RUNTIME_PROVIDERS } from '@novu/shared';
import { AlertCircle, KeyRound, Loader2, Play, RefreshCcw, Vault } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Credentials } from '../lib/credentials';
import {
  type AgentMcpServerEnablement,
  type AgentSummary,
  generateMcpOAuthUrl,
  getMcpConnectionStatus,
  McpApiError,
} from '../lib/mcp-api';
import { FlowDiagram } from './flow-diagram';
import { FLOW_STEPS, type FlowBranch, type FlowStep, isStepVisible } from './flow-steps';

/**
 * Simulator state machine. Each value names the "currently active" phase so
 * `activeStepId` can be derived in one switch. Real API calls happen in
 * `checkingVault` (status lookup), `oauthLaunch` (authorize URL + popup),
 * `tokenStored` (re-poll connection). Everything else uses a 400 ms delay
 * for legibility.
 */
type SimulatorState =
  | { kind: 'idle' }
  | { kind: 'user-sends' }
  | { kind: 'novu-receives' }
  | { kind: 'runtime-handles' }
  | { kind: 'checking-vault' }
  | { kind: 'mcp-call-hit' }
  | { kind: 'mcp-data-hit' }
  | { kind: 'runtime-needs-oauth' }
  | { kind: 'novu-dcr' }
  | { kind: 'user-authorizes' }
  | { kind: 'novu-stores-token' }
  | { kind: 'runtime-resumes' }
  | { kind: 'mcp-call-miss' }
  | { kind: 'mcp-data-miss' }
  | { kind: 'done'; branch: FlowBranch }
  | { kind: 'error'; message: string; atStepId: string | null };

const VISUAL_STEP_DELAY_MS = 600;

/** Maps a simulator state to the active step's id from `flow-steps.ts`. */
function stateToStepId(state: SimulatorState): string | null {
  switch (state.kind) {
    case 'user-sends':
      return 'user-sends';
    case 'novu-receives':
      return 'novu-receives';
    case 'runtime-handles':
      return 'runtime-handles';
    case 'checking-vault':
      return 'runtime-checks-token';
    case 'mcp-call-hit':
      return 'mcp-call-hit';
    case 'mcp-data-hit':
      return 'mcp-data-hit';
    case 'runtime-needs-oauth':
      return 'runtime-needs-oauth';
    case 'novu-dcr':
      return 'novu-dcr';
    case 'user-authorizes':
      return 'user-authorizes';
    case 'novu-stores-token':
      return 'novu-stores-token';
    case 'runtime-resumes':
      return 'runtime-resumes';
    case 'mcp-call-miss':
      return 'mcp-call-miss';
    case 'mcp-data-miss':
      return 'mcp-data-miss';
    case 'done':
      return 'user-receives';
    case 'error':
      return state.atStepId;
    case 'idle':
    default:
      return null;
  }
}

type OAuthResultMessage = {
  type: 'novu-mcp-oauth-result';
  status: 'connected' | 'error';
  reason?: string;
};

export function FlowSimulator({
  credentials,
  agent,
  enablement,
  subscriberId,
}: {
  credentials: Credentials;
  agent: AgentSummary | null;
  enablement: AgentMcpServerEnablement | null;
  subscriberId: string;
}) {
  const [state, setState] = useState<SimulatorState>({ kind: 'idle' });
  const [branch, setBranch] = useState<FlowBranch | undefined>(undefined);
  const [completedStepIds, setCompletedStepIds] = useState<ReadonlySet<string>>(new Set());

  // Refs to support cancellation + ignoring stale popup messages from prior runs.
  const runIdRef = useRef(0);
  const popupRef = useRef<Window | null>(null);
  const oauthResolverRef = useRef<((status: 'connected' | 'error', reason?: string) => void) | null>(null);

  const storage = useStorageDescriptor(agent);

  const ready = Boolean(agent && enablement && subscriberId.trim().length > 0);
  const dcrManaged = enablement?.defaultAuthMode === 'dcr';

  const activeStepId = stateToStepId(state);

  const reset = useCallback(() => {
    runIdRef.current += 1; // cancels any in-flight simulation
    oauthResolverRef.current = null;
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
    setState({ kind: 'idle' });
    setBranch(undefined);
    setCompletedStepIds(new Set());
  }, []);

  // Listen for postMessage from the OAuth result page. We accept the message
  // when an OAuth round-trip is in flight; otherwise it's a stale event.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as OAuthResultMessage | undefined;
      if (!data || data.type !== 'novu-mcp-oauth-result') return;
      const resolve = oauthResolverRef.current;
      if (!resolve) return;
      resolve(data.status, data.reason);
    }
    window.addEventListener('message', onMessage);

    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Reset the simulator when the selection changes — stale state across MCPs
  // is more confusing than helpful. The reset function itself is stable
  // (useCallback with empty deps); we only re-run when the selection inputs
  // change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `reset` is stable; re-running on its identity would re-fire on every state change.
  useEffect(() => {
    reset();
  }, [agent?.identifier, enablement?.id, subscriberId]);

  const run = useCallback(async () => {
    if (!ready || !agent || !enablement) return;

    const runId = ++runIdRef.current;
    oauthResolverRef.current = null;
    setCompletedStepIds(new Set());
    setBranch(undefined);

    const isCanceled = () => runIdRef.current !== runId;

    const advance = async (next: SimulatorState, justCompleted: string | null) => {
      if (isCanceled()) return;
      if (justCompleted) {
        setCompletedStepIds((prev) => {
          const out = new Set(prev);
          out.add(justCompleted);

          return out;
        });
      }
      setState(next);
    };

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(resolve, ms);
        // No need to clear on cancel — the canceled check at the top of each
        // continuation will short-circuit any further state writes.
        void t;
      });

    const failAt = (message: string, atStepId: string | null) => {
      setState({ kind: 'error', message, atStepId });
    };

    try {
      // ── Common preamble (visualization only) ─────────────────────────────
      await advance({ kind: 'user-sends' }, null);
      await wait(VISUAL_STEP_DELAY_MS);
      if (isCanceled()) return;

      await advance({ kind: 'novu-receives' }, 'user-sends');
      await wait(VISUAL_STEP_DELAY_MS);
      if (isCanceled()) return;

      await advance({ kind: 'runtime-handles' }, 'novu-receives');
      await wait(VISUAL_STEP_DELAY_MS);
      if (isCanceled()) return;

      await advance({ kind: 'checking-vault' }, 'runtime-handles');

      // ── Real call: connection status ─────────────────────────────────────
      let connection: Awaited<ReturnType<typeof getMcpConnectionStatus>>;
      try {
        connection = await getMcpConnectionStatus(credentials, agent.identifier, enablement.mcpId, subscriberId.trim());
      } catch (err) {
        if (isCanceled()) return;
        failAt(toErrorMessage(err), 'runtime-checks-token');

        return;
      }
      if (isCanceled()) return;

      const tokenIsLive = connection?.status === 'connected';
      const takenBranch: FlowBranch = tokenIsLive ? 'hit' : 'miss';
      setBranch(takenBranch);

      if (tokenIsLive) {
        await advance({ kind: 'mcp-call-hit' }, 'runtime-checks-token');
        await wait(VISUAL_STEP_DELAY_MS);
        if (isCanceled()) return;

        await advance({ kind: 'mcp-data-hit' }, 'mcp-call-hit');
        await wait(VISUAL_STEP_DELAY_MS);
        if (isCanceled()) return;

        await advance({ kind: 'done', branch: 'hit' }, 'mcp-data-hit');

        return;
      }

      // ── Miss branch ──────────────────────────────────────────────────────
      if (!dcrManaged) {
        failAt(
          `MCP "${enablement.mcpId}" has auth mode "${enablement.defaultAuthMode}". OAuth simulation is only wired for auth mode "dcr"; this simulator cannot continue on the miss branch.`,
          'runtime-needs-oauth'
        );

        return;
      }

      await advance({ kind: 'runtime-needs-oauth' }, 'runtime-checks-token');
      await wait(VISUAL_STEP_DELAY_MS);
      if (isCanceled()) return;

      await advance({ kind: 'novu-dcr' }, 'runtime-needs-oauth');

      // ── Real call: generate authorize URL + open popup ───────────────────
      let authorizeUrl: string;
      try {
        const result = await generateMcpOAuthUrl(credentials, agent.identifier, enablement.mcpId, {
          subscriberId: subscriberId.trim(),
        });
        authorizeUrl = result.authorizeUrl;
      } catch (err) {
        if (isCanceled()) return;
        failAt(toErrorMessage(err), 'novu-dcr');

        return;
      }
      if (isCanceled()) return;

      // Intentionally omit `noopener`: the same-origin OAuth result page calls
      // `window.opener.postMessage(...)` to deliver the outcome, which requires
      // opener access. The `noopener=no` form is ambiguous across browsers — an
      // omitted feature is the unambiguous "opener access allowed" signal.
      const popup = window.open(authorizeUrl, 'novu-mcp-oauth-flow', 'width=520,height=720,scrollbars=yes');
      if (!popup) {
        failAt('Browser blocked the OAuth popup. Allow popups for this origin and re-run the simulation.', 'novu-dcr');

        return;
      }
      popupRef.current = popup;

      await advance({ kind: 'user-authorizes' }, 'novu-dcr');

      // ── Wait for postMessage from oauth/result page (or popup close) ─────
      const oauthOutcome = await new Promise<{ status: 'connected' | 'error'; reason?: string }>((resolve) => {
        // Defensive: if the user closes the popup without completing OAuth,
        // detect via polling and treat as an error. Cleared in every resolver
        // path (postMessage, popup-closed, cancel) to avoid a leaked timer.
        const interval = setInterval(() => {
          if (isCanceled()) {
            clearInterval(interval);

            return;
          }
          if (popupRef.current?.closed) {
            clearInterval(interval);
            if (oauthResolverRef.current) {
              const r = oauthResolverRef.current;
              oauthResolverRef.current = null;
              r('error', 'OAuth popup was closed before completion.');
            }
          }
        }, 600);

        oauthResolverRef.current = (status, reason) => {
          clearInterval(interval);
          oauthResolverRef.current = null;
          resolve({ status, reason });
        };
      });

      if (isCanceled()) return;
      popupRef.current = null;

      if (oauthOutcome.status === 'error') {
        failAt(`OAuth did not complete: ${oauthOutcome.reason ?? 'unknown reason'}`, 'user-authorizes');

        return;
      }

      await advance({ kind: 'novu-stores-token' }, 'user-authorizes');

      // ── Real call: confirm the connection actually landed ────────────────
      try {
        const confirm = await getMcpConnectionStatus(
          credentials,
          agent.identifier,
          enablement.mcpId,
          subscriberId.trim()
        );
        if (confirm?.status !== 'connected') {
          failAt(
            `Connection status is "${confirm?.status ?? 'missing'}" after OAuth callback; expected "connected".`,
            'novu-stores-token'
          );

          return;
        }
      } catch (err) {
        if (isCanceled()) return;
        failAt(toErrorMessage(err), 'novu-stores-token');

        return;
      }
      if (isCanceled()) return;

      await advance({ kind: 'runtime-resumes' }, 'novu-stores-token');
      await wait(VISUAL_STEP_DELAY_MS);
      if (isCanceled()) return;

      await advance({ kind: 'mcp-call-miss' }, 'runtime-resumes');
      await wait(VISUAL_STEP_DELAY_MS);
      if (isCanceled()) return;

      await advance({ kind: 'mcp-data-miss' }, 'mcp-call-miss');
      await wait(VISUAL_STEP_DELAY_MS);
      if (isCanceled()) return;

      await advance({ kind: 'done', branch: 'miss' }, 'mcp-data-miss');
    } catch (err) {
      if (isCanceled()) return;
      setState({ kind: 'error', message: toErrorMessage(err), atStepId: stateToStepId(state) });
    }
  }, [ready, agent, enablement, subscriberId, credentials, dcrManaged, state]);

  const visibleSteps = useMemo(() => FLOW_STEPS.filter((step) => isStepVisible(step, branch)), [branch]);
  const isRunning = state.kind !== 'idle' && state.kind !== 'done' && state.kind !== 'error';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b px-4 py-3 shrink-0 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Flow simulator</h2>
          <p className="text-xs text-muted-foreground">
            Visualize a managed-agent turn end-to-end. The check-token, DCR, and token-stored steps make real Novu API
            calls; everything else is illustration.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={run} disabled={!ready || isRunning}>
            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            <span className="ml-1">Run</span>
          </Button>
          <Button variant="outline" size="sm" onClick={reset} disabled={state.kind === 'idle'}>
            <RefreshCcw className="h-3.5 w-3.5" />
            <span className="ml-1">Reset</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <StorageIndicator storage={storage} />

        <Scenario agent={agent} enablement={enablement} subscriberId={subscriberId} />

        {state.kind === 'error' ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-xs">Simulation halted</AlertTitle>
            <AlertDescription className="text-xs">{state.message}</AlertDescription>
          </Alert>
        ) : null}

        {state.kind === 'done' ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-xs">
              Done · {state.branch === 'hit' ? 'vault-hit' : 'vault-miss'} branch
            </AlertTitle>
            <AlertDescription className="text-xs">
              {state.branch === 'hit'
                ? 'Token was already present, so no OAuth was needed.'
                : 'OAuth completed, token persisted, runtime resumed the turn.'}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="rounded-md border bg-card/40 p-2 overflow-x-auto">
          <FlowDiagram activeStepId={activeStepId} completedStepIds={completedStepIds} selectedBranch={branch} />
        </div>

        <Separator />

        <Stepper steps={visibleSteps} activeStepId={activeStepId} completedStepIds={completedStepIds} branch={branch} />
      </div>
    </div>
  );
}

function Scenario({
  agent,
  enablement,
  subscriberId,
}: {
  agent: AgentSummary | null;
  enablement: AgentMcpServerEnablement | null;
  subscriberId: string;
}) {
  if (!agent || !enablement || !subscriberId.trim()) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Pick an agent, an enabled MCP on the left, and enter a subscriber id on the right to run the simulator.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card/40 p-3 text-xs space-y-1.5">
      <ScenarioRow label="Agent" value={`${agent.name} (${agent.identifier})`} />
      <ScenarioRow label="MCP" value={enablement.mcpId} />
      <ScenarioRow label="Subscriber" value={<code>{subscriberId.trim()}</code>} />
      <ScenarioRow
        label="Auth mode"
        value={
          <Badge variant="outline" className="text-[10px] py-0">
            {enablement.defaultAuthMode}
          </Badge>
        }
      />
    </div>
  );
}

function ScenarioRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

type StorageDescriptor =
  | { kind: 'novu'; providerName: string }
  | { kind: 'vault'; providerName: string }
  | { kind: 'unknown' };

function useStorageDescriptor(agent: AgentSummary | null): StorageDescriptor {
  return useMemo(() => {
    if (!agent?.managedRuntime?.providerId) {
      return { kind: 'unknown' };
    }
    const provider = AGENT_RUNTIME_PROVIDERS.find((p) => p.providerId === agent.managedRuntime?.providerId);
    if (!provider) {
      return { kind: 'unknown' };
    }

    return provider.capabilities.tokenVault
      ? { kind: 'vault', providerName: provider.displayName }
      : { kind: 'novu', providerName: provider.displayName };
  }, [agent]);
}

function StorageIndicator({ storage }: { storage: StorageDescriptor }) {
  if (storage.kind === 'unknown') {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground flex items-center gap-2">
        <KeyRound className="h-3.5 w-3.5" />
        <span>
          Storage location unknown — agent has no managed runtime provider, or its provider isn&apos;t in the shared
          catalog yet.
        </span>
      </div>
    );
  }

  if (storage.kind === 'vault') {
    return (
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs flex items-start gap-2">
        <Vault className="h-4 w-4 text-emerald-600 mt-px" />
        <div>
          <div className="font-medium">Token stored in the runtime vault</div>
          <div className="text-muted-foreground">
            {storage.providerName} advertises <code>tokenVault: true</code>. After OAuth, Novu pushes the access token
            to the runtime&apos;s vault API and leaves <code>mcp_connection.auth</code> empty.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs flex items-start gap-2">
      <KeyRound className="h-4 w-4 text-amber-600 mt-px" />
      <div>
        <div className="font-medium">Token stored by Novu (encrypted)</div>
        <div className="text-muted-foreground">
          {storage.providerName} has <code>tokenVault: false</code>, so Novu persists the encrypted access/refresh
          tokens on <code>mcp_connection.auth</code> and replays them on every runtime turn.
        </div>
      </div>
    </div>
  );
}

function Stepper({
  steps,
  activeStepId,
  completedStepIds,
  branch,
}: {
  steps: FlowStep[];
  activeStepId: string | null;
  completedStepIds: ReadonlySet<string>;
  branch: FlowBranch | undefined;
}) {
  return (
    <ol className="space-y-2">
      {steps.map((step, index) => {
        const active = step.id === activeStepId;
        const completed = completedStepIds.has(step.id);

        return (
          <li
            key={step.id}
            className={cn(
              'rounded-md border p-2.5 transition-colors',
              active && 'border-primary/60 bg-primary/5',
              !active && completed && 'border-border bg-muted/30',
              !active && !completed && 'border-dashed border-border/60 bg-transparent'
            )}
          >
            <div className="flex items-start gap-2">
              <div
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                  active && 'bg-primary text-primary-foreground',
                  !active && completed && 'bg-muted text-muted-foreground',
                  !active && !completed && 'border border-border text-muted-foreground'
                )}
              >
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-xs font-medium', !active && !completed && 'text-muted-foreground')}>
                    {step.label}
                  </span>
                  {step.branch ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] uppercase py-0',
                        step.branch === 'hit' && 'border-emerald-500/40 text-emerald-600',
                        step.branch === 'miss' && 'border-amber-500/40 text-amber-600'
                      )}
                    >
                      {step.branch}
                    </Badge>
                  ) : null}
                </div>
                {step.note ? <p className="mt-0.5 text-[11px] text-muted-foreground">{step.note}</p> : null}
              </div>
            </div>
          </li>
        );
      })}
      {branch === undefined ? (
        <li className="rounded-md border border-dashed p-2 text-[11px] text-muted-foreground">
          Branch will be selected after the runtime checks the connection status.
        </li>
      ) : null}
    </ol>
  );
}

function toErrorMessage(err: unknown): string {
  if (err instanceof McpApiError) {
    return `${err.status}: ${err.message}`;
  }
  if (err instanceof Error) {
    return err.message;
  }

  return String(err);
}
