import type { WizardGoal } from '../ui/wizard-session';
import type { DetectedTopology } from './detect-install-targets';

/**
 * Outcome of mapping `(requestedGoal, topology)` to a goal that
 * actually fits what the user has on disk.
 *
 * `kind: 'ok'` means the install + agent steps can proceed with
 * `effectiveGoal`. When `effectiveGoal !== requestedGoal` we degraded
 * (e.g. user asked for `full` but the repo only has a web app, so we
 * downgrade to `inbox`); `reason` carries the user-visible message
 * surfaced in the live tail and report.
 *
 * `kind: 'block'` means the requested goal is incompatible with the
 * topology in a way we can't paper over (user explicitly asked for
 * `inbox` but no UI workspace exists). The runner aborts the wizard
 * with `reason` as the error message.
 */
export type GoalRebalanceResult =
  | {
      kind: 'ok';
      requestedGoal: WizardGoal;
      effectiveGoal: WizardGoal;
      /**
       * Human-readable line shown in the live-tail and report whenever
       * `effectiveGoal !== requestedGoal`. Empty string when the goal
       * stays the same.
       */
      reason: string;
    }
  | {
      kind: 'block';
      requestedGoal: WizardGoal;
      reason: string;
    };

export interface RebalanceGoalInput {
  requestedGoal: WizardGoal;
  topology: DetectedTopology;
}

/**
 * Maps the user's requested wizard goal against the topology that
 * `detectInstallTargets()` produced and returns either a (possibly
 * downgraded) effective goal or a block decision.
 *
 * Behavioural matrix (see plan `Per-role package matrix` for context):
 *
 *  - `full`        × any web/fullstack + any api/fullstack → `full`
 *  - `full`        × web-only (no api / no fullstack)      → `inbox`
 *  - `full`        × api-only (no web / no fullstack)      → `workflows`
 *  - `inbox`       × has web or fullstack                   → `inbox`
 *  - `inbox`       × api-only                              → BLOCK
 *  - `workflows`   × has api or fullstack                   → `workflows`
 *  - `workflows`   × web-only                              → BLOCK
 *
 * No-targets falls into "unknown topology" — the wizard preserves the
 * requested goal (the agent will continue on a best-effort basis).
 */
export function rebalanceGoal(input: RebalanceGoalInput): GoalRebalanceResult {
  const { requestedGoal, topology } = input;
  const { hasWeb, hasApi, hasFullstack, targets } = topology;
  const canHostInbox = hasWeb || hasFullstack;
  const canHostWorkflows = hasApi || hasFullstack;

  if (targets.length === 0) {
    return ok(requestedGoal, requestedGoal, '');
  }

  if (requestedGoal === 'full') {
    if (canHostInbox && canHostWorkflows) {
      return ok('full', 'full', '');
    }
    if (canHostInbox && !canHostWorkflows) {
      return ok('full', 'inbox', `Detected ${describeTopology(topology)} — no API workspace, running inbox-only flow.`);
    }
    if (!canHostInbox && canHostWorkflows) {
      return ok(
        'full',
        'workflows',
        `Detected ${describeTopology(topology)} — no UI workspace, running workflows-only flow.`
      );
    }

    return ok('full', requestedGoal, '');
  }

  if (requestedGoal === 'inbox') {
    if (canHostInbox) return ok('inbox', 'inbox', '');

    return block(
      'inbox',
      `Inbox goal requested but no UI workspace was detected. Detected ${describeTopology(topology)}. ` +
        'Re-run with `--goal=workflows` (to wire triggers) or invoke the wizard from a workspace ' +
        'that has React, Next.js, Vue, Svelte, etc.'
    );
  }

  if (requestedGoal === 'workflows') {
    if (canHostWorkflows) return ok('workflows', 'workflows', '');

    return block(
      'workflows',
      `Workflows goal requested but no backend workspace was detected. Detected ${describeTopology(topology)}. ` +
        'Re-run with `--goal=inbox` (to wire the Inbox UI) or invoke the wizard from a workspace ' +
        'that has Hono, Express, Fastify, NestJS, Wrangler, etc.'
    );
  }

  return ok(requestedGoal, requestedGoal, '');
}

function ok(requestedGoal: WizardGoal, effectiveGoal: WizardGoal, reason: string): GoalRebalanceResult {
  return { kind: 'ok', requestedGoal, effectiveGoal, reason };
}

function block(requestedGoal: WizardGoal, reason: string): GoalRebalanceResult {
  return { kind: 'block', requestedGoal, reason };
}

function describeTopology(topology: DetectedTopology): string {
  const counts: string[] = [];
  if (topology.hasFullstack) counts.push(countOf(topology, 'fullstack'));
  if (topology.hasWeb) counts.push(countOf(topology, 'web'));
  if (topology.hasApi) counts.push(countOf(topology, 'api'));

  if (counts.length === 0) return 'no application workspaces';

  return counts.join(' + ');
}

function countOf(topology: DetectedTopology, role: 'web' | 'api' | 'fullstack'): string {
  const n = topology.targets.filter((t) => t.classification.role === role).length;
  if (n <= 1) return `single ${role} app`;

  return `${n} ${role} apps`;
}
