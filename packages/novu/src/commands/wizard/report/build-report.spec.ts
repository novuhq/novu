import { describe, expect, it } from 'vitest';
import { CloudRegionEnum } from '../../dev/enums';
import type { DetectedTopology, InstallTarget } from '../context/detect-install-targets';
import type { AgentRunResult, AgentRunTimings, ProjectContext, ResolvedAuth } from '../types';
import type { TrailEntry } from '../ui/store';
import { TrailKind } from '../ui/store';
import { buildReport } from './build-report';

function fakeTimings(): AgentRunTimings {
  return { agentStartedAt: 0, agentEndedAt: 0, branches: [] };
}

function fakeNextJsTarget(): InstallTarget {
  return {
    cwd: '/proj',
    workspaceName: 'sample',
    classification: {
      role: 'fullstack',
      reason: 'Next.js App Router',
      framework: 'nextjs-app',
      isReactNative: false,
      isReactBased: true,
    },
    installedDeps: new Set(['next', 'react', '@novu/nextjs']),
    installedNovuPackages: ['@novu/nextjs'],
    hasFrameworkRoute: false,
    frameworkRoutePath: null,
    hasTypeScript: true,
    pkg: { name: 'sample' },
    packageJsonPath: '/proj/package.json',
  };
}

function fakeTopology(): DetectedTopology {
  const target = fakeNextJsTarget();

  return {
    rootCwd: '/proj',
    packageManager: 'pnpm',
    workspaces: [{ cwd: target.cwd, workspaceName: target.workspaceName, classification: target.classification }],
    targets: [target],
    hasWeb: false,
    hasApi: false,
    hasFullstack: true,
  };
}

function fakeProject(): ProjectContext {
  return {
    cwd: '/proj',
    rootPackageJsonPath: '/proj/package.json',
    packageManager: 'pnpm',
    hasTypeScript: true,
    topology: fakeTopology(),
  };
}

function fakeAuth(): ResolvedAuth {
  return {
    secretKey: 'sk_test',
    environmentId: 'env-1',
    environmentName: 'Development',
    apiUrl: 'https://api.novu.co',
    dashboardUrl: 'https://dashboard.novu.co',
    region: CloudRegionEnum.US,
    source: 'env',
  };
}

function toolUse(toolName: string, label: string): TrailEntry {
  return {
    kind: TrailKind.ToolUse,
    id: `t-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    toolName,
    label,
    inputSummary: label,
  };
}

function diff(file: string, patch: string): TrailEntry {
  return {
    kind: TrailKind.Diff,
    id: `d-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    file,
    patch,
    added: 1,
    removed: 0,
  };
}

describe('buildReport', () => {
  it('renders a complete report from agent JSON aggregate + trail', () => {
    const trail: TrailEntry[] = [
      toolUse('Write', 'app/components/inbox.tsx'),
      toolUse('Edit', 'app/api/checkout/route.ts'),
      toolUse('mcp__novu__create_workflow', 'order-confirmation'),
    ];
    const agentResult: AgentRunResult = {
      totalMessages: 12,
      toolCalls: 9,
      errors: 0,
      branches: {
        inbox: {
          branch: 'inbox',
          filesChanged: [{ path: 'app/layout.tsx', kind: 'edited' }],
          workflowsCreated: [],
          triggersWired: [],
          subscriberSyncPoints: [],
          manualTriggersNeeded: [],
          notes: [],
        },
        workflows: {
          branch: 'workflows',
          filesChanged: [{ path: 'app/api/checkout/route.ts', kind: 'edited' }],
          workflowsCreated: [{ id: 'order-confirmation', trigger: 'order.placed', kind: 'mcp' }],
          triggersWired: [
            {
              workflowId: 'order-confirmation',
              serverFile: 'app/api/checkout/route.ts:42',
              uiFile: 'app/cart/page.tsx:88',
            },
          ],
          subscriberSyncPoints: [],
          manualTriggersNeeded: [],
          notes: ['picked product nouns from package.json description'],
        },
        subscribers: {
          branch: 'subscribers',
          filesChanged: [{ path: 'app/api/auth/[...nextauth]/route.ts', kind: 'edited' }],
          workflowsCreated: [],
          triggersWired: [],
          subscriberSyncPoints: [{ file: 'app/api/auth/[...nextauth]/route.ts:120', hook: 'sign-up' }],
          manualTriggersNeeded: [],
          notes: [],
        },
      },
      branchParseFailures: [],
      timings: fakeTimings(),
    };

    const md = buildReport({
      cwd: '/proj',
      goal: 'full',
      project: fakeProject(),
      auth: fakeAuth(),
      trail,
      installedSkillsCount: 4,
      mcpInstalled: [{ clientId: 'cursor', clientLabel: 'Cursor', configPath: '~/.cursor/mcp.json' }],
      agentResult,
    });

    expect(md).toMatch(/^# Novu Wizard report/m);
    expect(md).toMatch(/## Goal[\s\S]+Full Novu integration/);
    expect(md).toMatch(/## Project context[\s\S]+Workspaces:.*nextjs-app/);
    expect(md).toMatch(/## Files changed[\s\S]+app\/layout\.tsx/);
    expect(md).toMatch(/## Files changed[\s\S]+app\/api\/checkout\/route\.ts/);
    expect(md).toMatch(/## Workflows created[\s\S]+order-confirmation[\s\S]+order\.placed[\s\S]+no-code/);
    expect(md).toMatch(
      /## Trigger sites wired[\s\S]+order-confirmation[\s\S]+app\/api\/checkout\/route\.ts:42[\s\S]+app\/cart\/page\.tsx:88/
    );
    expect(md).toMatch(/## Subscriber sync points[\s\S]+app\/api\/auth/);
    expect(md).toMatch(/## Wizard ops[\s\S]+Cursor/);
    expect(md).toMatch(/## Notes[\s\S]+picked product nouns/);
    expect(md).toMatch(/## Next steps[\s\S]+NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER/);
    expect(md).not.toMatch(/Manual triggers needed/);
  });

  it('falls back to the trail when the agent omits its JSON aggregate', () => {
    const trail: TrailEntry[] = [
      toolUse('Write', 'app/components/inbox.tsx'),
      toolUse('Edit', 'app/api/checkout/route.ts'),
      diff('app/api/checkout/route.ts', '+ await novu.trigger("order-confirmation", { ... })'),
      toolUse('mcp__novu__create_workflow', 'order-confirmation'),
    ];

    const md = buildReport({
      cwd: '/proj',
      goal: 'full',
      project: fakeProject(),
      auth: fakeAuth(),
      trail,
      installedSkillsCount: 4,
      mcpInstalled: null,
      agentResult: null,
    });

    expect(md).toMatch(/Files changed[\s\S]+app\/components\/inbox\.tsx/);
    expect(md).toMatch(/Workflows created[\s\S]+order-confirmation/);
    expect(md).toMatch(/Trigger sites wired[\s\S]+app\/api\/checkout\/route\.ts[\s\S]+wired via `novu\.trigger`/);
  });

  it('flags branches that failed to parse so the user knows the report is partial', () => {
    const md = buildReport({
      cwd: '/proj',
      goal: 'full',
      project: fakeProject(),
      auth: fakeAuth(),
      trail: [],
      installedSkillsCount: 0,
      mcpInstalled: null,
      agentResult: {
        totalMessages: 1,
        toolCalls: 0,
        errors: 0,
        branches: {},
        branchParseFailures: ['inbox'],
        timings: fakeTimings(),
      },
    });

    expect(md).toMatch(/## Notes[\s\S]+inbox[\s\S]+could not parse/);
  });

  it('omits the validation section when no validation result was passed', () => {
    const md = buildReport({
      cwd: '/proj',
      goal: 'full',
      project: fakeProject(),
      auth: fakeAuth(),
      trail: [],
      installedSkillsCount: 0,
      mcpInstalled: null,
      agentResult: null,
    });
    expect(md).not.toMatch(/## Validation/);
  });

  it('renders an "all passed" validation block when every check exits 0', () => {
    const md = buildReport({
      cwd: '/proj',
      goal: 'full',
      project: fakeProject(),
      auth: fakeAuth(),
      trail: [],
      installedSkillsCount: 0,
      mcpInstalled: null,
      agentResult: null,
      validation: [
        {
          workspace: 'apps/web',
          cwd: '/proj/apps/web',
          kind: 'lint',
          scriptName: 'lint',
          command: 'pnpm run lint',
          exitCode: 0,
          durationMs: 800,
          stdoutTail: '',
          stderrTail: '',
          timedOut: false,
        },
        {
          workspace: 'apps/web',
          cwd: '/proj/apps/web',
          kind: 'typecheck',
          scriptName: 'check-types',
          command: 'pnpm run check-types',
          exitCode: 0,
          durationMs: 12_500,
          stdoutTail: '',
          stderrTail: '',
          timedOut: false,
        },
      ],
      validationAttempts: 1,
      validationReason: 'clean',
    });
    expect(md).toMatch(/## Validation[\s\S]+Passed \(2\)/);
    expect(md).toMatch(/`apps\/web` · lint · `pnpm run lint`/);
    expect(md).toMatch(/`apps\/web` · typecheck · `pnpm run check-types`/);
    expect(md).not.toMatch(/Failures \(/);
    expect(md).not.toMatch(/auto-fix turn/);
  });

  it('flags an "auto-fixed after N attempts" message when the loop converged', () => {
    const md = buildReport({
      cwd: '/proj',
      goal: 'full',
      project: fakeProject(),
      auth: fakeAuth(),
      trail: [],
      installedSkillsCount: 0,
      mcpInstalled: null,
      agentResult: null,
      validation: [
        {
          workspace: 'apps/web',
          cwd: '/proj/apps/web',
          kind: 'typecheck',
          scriptName: 'check-types',
          command: 'pnpm run check-types',
          exitCode: 0,
          durationMs: 12_500,
          stdoutTail: '',
          stderrTail: '',
          timedOut: false,
        },
      ],
      validationAttempts: 3,
      validationReason: 'clean',
    });
    expect(md).toMatch(/All checks pass after 2 auto-fix turns/);
    expect(md).toMatch(/Passed \(1\)/);
  });

  it('surfaces validation failures with stderr tail and exit code', () => {
    const md = buildReport({
      cwd: '/proj',
      goal: 'full',
      project: fakeProject(),
      auth: fakeAuth(),
      trail: [],
      installedSkillsCount: 0,
      mcpInstalled: null,
      agentResult: null,
      validation: [
        {
          workspace: 'apps/api',
          cwd: '/proj/apps/api',
          kind: 'typecheck',
          scriptName: 'check-types',
          command: 'pnpm run check-types',
          exitCode: 2,
          durationMs: 9_400,
          stdoutTail: '',
          stderrTail: "src/foo.ts(12,5): error TS2322: Type 'number' is not assignable to type 'string'.",
          timedOut: false,
        },
      ],
      validationAttempts: 1,
      validationReason: 'clean',
    });
    expect(md).toMatch(/## Validation[\s\S]+Failures \(1\)/);
    expect(md).toMatch(/`apps\/api` · typecheck · `pnpm run check-types` · exit 2/);
    expect(md).toMatch(/error TS2322/);
    expect(md).not.toMatch(/budget exhausted/);
  });

  it('prefixes a budget-exhausted note when the fix loop bailed early', () => {
    const md = buildReport({
      cwd: '/proj',
      goal: 'full',
      project: fakeProject(),
      auth: fakeAuth(),
      trail: [],
      installedSkillsCount: 0,
      mcpInstalled: null,
      agentResult: null,
      validation: [
        {
          workspace: 'apps/api',
          cwd: '/proj/apps/api',
          kind: 'typecheck',
          scriptName: 'check-types',
          command: 'pnpm run check-types',
          exitCode: 2,
          durationMs: 9_400,
          stdoutTail: '',
          stderrTail: 'error TS2322',
          timedOut: false,
        },
      ],
      validationAttempts: 2,
      validationReason: 'budget',
    });
    expect(md).toMatch(/Validation budget exhausted after 2 fix attempts/);
    expect(md).toMatch(/manual follow-up/);
    expect(md).toMatch(/Failures \(1\)/);
  });

  it('renders a friendly note when validation ran but no scripts existed', () => {
    const md = buildReport({
      cwd: '/proj',
      goal: 'full',
      project: fakeProject(),
      auth: fakeAuth(),
      trail: [],
      installedSkillsCount: 0,
      mcpInstalled: null,
      agentResult: null,
      validation: [],
    });
    expect(md).toMatch(/## Validation[\s\S]+No `lint` \/ `typecheck` scripts/);
  });

  it('renders the manual-triggers section only when something is missing', () => {
    const md = buildReport({
      cwd: '/proj',
      goal: 'workflows',
      project: fakeProject(),
      auth: fakeAuth(),
      trail: [],
      installedSkillsCount: 0,
      mcpInstalled: null,
      agentResult: {
        totalMessages: 1,
        toolCalls: 0,
        errors: 0,
        branches: {
          workflows: {
            branch: 'workflows',
            filesChanged: [],
            workflowsCreated: [{ id: 'orphan-workflow', trigger: 'orphan.event', kind: 'mcp' }],
            triggersWired: [],
            subscriberSyncPoints: [],
            manualTriggersNeeded: [{ workflowId: 'orphan-workflow', reason: 'no reachable invocation path' }],
            notes: [],
          },
        },
        branchParseFailures: [],
        timings: fakeTimings(),
      },
    });

    expect(md).toMatch(/Manual triggers needed[\s\S]+orphan-workflow[\s\S]+no reachable invocation path/);
  });
});
