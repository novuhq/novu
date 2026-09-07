import fs from 'node:fs';
import path from 'node:path';
import spawn from 'cross-spawn';
import type { WizardUI } from '../../ui/wizard-ui';
import type { PackageManagerDescriptor } from '../../utils/package-managers';
import type { InstallPackagesResult, InstallPackagesTargetResult } from './install-packages';

/**
 * One row in the report's "Validation" section. Each touched workspace
 * may produce 0 (no scripts), 1 (lint only), or 2 (lint + typecheck)
 * rows.
 */
export interface ValidationResult {
  workspace: string;
  cwd: string;
  /** Which validation pass produced this row. */
  kind: 'lint' | 'typecheck';
  /** The npm script we resolved (e.g. `lint`, `check-types`, `typecheck`). */
  scriptName: string;
  /** Resolved command line (kept for the report + live tail). */
  command: string;
  exitCode: number;
  durationMs: number;
  /** Tail of stdout — capped to ~2 KB to keep the report small. */
  stdoutTail: string;
  /** Tail of stderr — capped to ~2 KB to keep the report small. */
  stderrTail: string;
  /** True when the spawn timed out. */
  timedOut: boolean;
}

export interface RunValidateStepInput {
  ui: WizardUI;
  installResult: InstallPackagesResult;
}

/**
 * Hard cap on the wall-clock for a single lint or typecheck invocation.
 * Three minutes is generous enough for monorepo-wide passes while
 * preventing a hung process from stalling the wizard indefinitely.
 */
const VALIDATION_TIMEOUT_MS = 180_000;
const OUTPUT_TAIL_BYTES = 2_048;

/**
 * Script names probed for the `lint` kind. The first script with a
 * non-empty value in the workspace's `package.json` wins. Order matters:
 *
 *  - `lint`            — canonical, used by Next.js, Turbo, Nx, biome users.
 *  - `lint:check`      — explicit non-fix variant when `lint` runs `--fix`.
 *  - `check:lint`      — turbo `check:*` namespaced convention.
 *  - `check`           — biome convention (covers `biome check` users).
 *
 * Auto-fix variants (`lint:fix`, `lint:write`, …) are intentionally
 * omitted — running them during validation would silently mutate the
 * agent's edits.
 */
export const LINT_SCRIPT_CANDIDATES = ['lint', 'lint:check', 'check:lint', 'check'] as const;

/**
 * Script names probed for the `typecheck` kind. The first script with a
 * non-empty value wins. Order mirrors usage frequency:
 *
 *  - `typecheck`       — canonical (Vite + TS, modern templates).
 *  - `type-check`      — hyphenated variant (Vue templates).
 *  - `check-types`     — turbo template default.
 *  - `check:types`     — turbo `check:*` namespaced convention.
 *  - `tsc:check`       — explicit `tsc --noEmit` wrapper.
 *
 * Plain `tsc` / `types` are intentionally NOT included — `tsc` without
 * `--noEmit` writes build artefacts to disk, and `types` is too generic
 * to assume read-only semantics.
 */
export const TYPECHECK_SCRIPT_CANDIDATES = [
  'typecheck',
  'type-check',
  'check-types',
  'check:types',
  'tsc:check',
  'tsc:typecheck',
  'tsc',
] as const;

/**
 * The validation pass — one lint + one typecheck per touched workspace.
 *
 * Why this exists in the CLI (not the agent):
 *  - Agents historically fired `pnpm lint` / `pnpm --filter=<ws> check-types`
 *    multiple times per branch, sometimes across the whole monorepo. Each
 *    call costs 10–30s, and the workflows branch (the long pole) used to
 *    run 3+ of them. Centralising here trades that overhead for a single
 *    deterministic pass after fan-out.
 *  - `agent/can-use-tool.ts` denies these commands inside the SDK sandbox,
 *    so this is the ONLY place they run.
 *
 * Behaviour:
 *  - Iterates over `installResult.targets` (application workspaces only —
 *    libraries are already filtered out by the install step).
 *  - For each target, looks up the workspace's `package.json` scripts and
 *    runs the first match in {@link LINT_SCRIPT_CANDIDATES} → kind
 *    `lint`, then the first match in {@link TYPECHECK_SCRIPT_CANDIDATES}
 *    → kind `typecheck`. If a workspace has no matching script for a
 *    kind, that kind is silently skipped — no synthetic `tsc --noEmit`
 *    fallback, and no walk to the workspace root (running root scripts
 *    from the app cwd would fan back out across the whole monorepo).
 *  - Each invocation runs from the workspace's `cwd` using the
 *    `<package-manager> run <script>` shape so it works regardless of
 *    pnpm filter quirks.
 *  - Failures (non-zero exit, timeouts, missing binaries) are captured
 *    in the result; the step never throws. The runner surfaces them in
 *    the report and the live tail but does NOT bump `errorCount` — these
 *    are user-fixable issues, not wizard bugs.
 */
export async function runValidateStep(input: RunValidateStepInput): Promise<ValidationResult[]> {
  const { ui, installResult } = input;
  const results: ValidationResult[] = [];

  if (installResult.targets.length === 0) {
    ui.pushStatus('Validation skipped — no application workspaces detected.', 'warn');

    return results;
  }

  for (const target of installResult.targets) {
    const label = target.workspaceName ?? path.basename(target.cwd);
    const scripts = readWorkspaceScripts(target.cwd);

    const lint = pickScript(scripts, LINT_SCRIPT_CANDIDATES);
    if (lint) {
      const result = await runScript({
        ui,
        target,
        label,
        kind: 'lint',
        scriptName: lint,
        packageManager: installResult.packageManager,
      });
      results.push(result);
    } else {
      ui.pushLiveTail(`[validate] ${label}: no lint script — skipping`);
    }

    const typecheck = pickScript(scripts, TYPECHECK_SCRIPT_CANDIDATES);
    if (typecheck) {
      const result = await runScript({
        ui,
        target,
        label,
        kind: 'typecheck',
        scriptName: typecheck,
        packageManager: installResult.packageManager,
      });
      results.push(result);
    } else {
      ui.pushLiveTail(`[validate] ${label}: no typecheck script — skipping`);
    }
  }

  return results;
}

interface RunScriptInput {
  ui: WizardUI;
  target: InstallPackagesTargetResult;
  label: string;
  kind: ValidationResult['kind'];
  scriptName: string;
  packageManager: PackageManagerDescriptor;
}

async function runScript(input: RunScriptInput): Promise<ValidationResult> {
  const { ui, target, label, kind, scriptName, packageManager } = input;
  const command = renderRunCommand(packageManager, scriptName);
  const startedAt = Date.now();

  ui.pushStatus(`Validating ${label} (${kind})…`);
  ui.pushLiveTail(`[validate] ${label}: ${command}`);

  const spawnResult = await spawnValidation({ command, cwd: target.cwd, ui, label, kind });
  const durationMs = Date.now() - startedAt;

  const ok = spawnResult.exitCode === 0;
  const tone = ok ? 'ok' : 'warn';
  const summary = spawnResult.timedOut
    ? `Validation ${kind} for ${label} timed out after ${VALIDATION_TIMEOUT_MS / 1000}s.`
    : ok
      ? `Validated ${label} (${kind}).`
      : `Validation ${kind} for ${label} exited with code ${spawnResult.exitCode}.`;
  ui.pushStatus(summary, tone);

  return {
    workspace: label,
    cwd: target.cwd,
    kind,
    scriptName,
    command,
    exitCode: spawnResult.exitCode,
    durationMs,
    stdoutTail: tail(spawnResult.stdout),
    stderrTail: tail(spawnResult.stderr),
    timedOut: spawnResult.timedOut,
  };
}

/**
 * Render `<package-manager> run <script>` for a given descriptor. We
 * always use `run` even where the manager allows the shorthand
 * (e.g. `yarn lint`) so the rendered command is unambiguous in the
 * report.
 */
function renderRunCommand(descriptor: PackageManagerDescriptor, scriptName: string): string {
  switch (descriptor.family) {
    case 'pnpm':
      return `pnpm run ${scriptName}`;
    case 'yarn':
      return `yarn run ${scriptName}`;
    case 'bun':
      return `bun run ${scriptName}`;
    default:
      return `npm run ${scriptName}`;
  }
}

interface SpawnValidationInput {
  command: string;
  cwd: string;
  ui: WizardUI;
  label: string;
  kind: ValidationResult['kind'];
}

interface SpawnValidationResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

function spawnValidation(input: SpawnValidationInput): Promise<SpawnValidationResult> {
  const [bin, ...args] = input.command.split(/\s+/).filter(Boolean);

  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      cwd: input.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ADBLOCK: '1',
        DISABLE_OPENCOLLECTIVE: '1',
        // Hard-disable interactive prompts in nested tools (tsc, eslint, …).
        CI: '1',
        FORCE_COLOR: '0',
      },
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, VALIDATION_TIMEOUT_MS);

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      streamToLiveTail(input.ui, input.label, input.kind, text);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      streamToLiveTail(input.ui, input.label, input.kind, text);
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      const message = err instanceof Error ? err.message : String(err);
      resolve({
        exitCode: -1,
        stdout,
        stderr: stderr + (stderr.endsWith('\n') ? '' : '\n') + message,
        timedOut,
      });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? -1, stdout, stderr, timedOut });
    });
  });
}

function streamToLiveTail(ui: WizardUI, label: string, kind: ValidationResult['kind'], text: string): void {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    ui.pushLiveTail(`[validate:${kind}] ${label}: ${line}`);
  }
}

/**
 * Read the workspace's `package.json` `scripts` dictionary best-effort.
 * Errors (missing file, malformed JSON, missing `scripts` key) all
 * collapse to `{}` so the caller treats the workspace as if it has no
 * matching script — validation is best-effort and never throws.
 */
export function readWorkspaceScripts(cwd: string): Record<string, string> {
  const pkgJsonPath = path.join(cwd, 'package.json');
  let raw: string;
  try {
    raw = fs.readFileSync(pkgJsonPath, 'utf8');
  } catch {
    return {};
  }

  let json: { scripts?: Record<string, string> };
  try {
    json = JSON.parse(raw);
  } catch {
    return {};
  }

  return json.scripts ?? {};
}

/**
 * Return the first script name from `candidates` that has a non-empty
 * value in the given `scripts` record. Returns `null` when none match.
 * Pure — does no I/O — so the candidate lists are unit-testable in
 * isolation from the filesystem.
 */
export function pickScript(scripts: Record<string, string>, candidates: readonly string[]): string | null {
  for (const candidate of candidates) {
    if (typeof scripts[candidate] === 'string' && scripts[candidate].trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

function tail(text: string): string {
  if (text.length <= OUTPUT_TAIL_BYTES) return text;

  return `…${text.slice(-OUTPUT_TAIL_BYTES)}`;
}

/**
 * Builds the one-line `hint` rendered next to the "Validated" row in
 * the pipeline pane. Examples:
 *
 *   "Skipped — no application workspaces"
 *   "All passed (4 checks across 2 workspaces)"
 *   "1 failed, 3 passed (apps/api lint exit 1)"
 */
export function summariseValidation(results: ValidationResult[]): string {
  if (results.length === 0) return 'Skipped — no validation scripts detected';

  const failed = results.filter((r) => r.exitCode !== 0);
  const passed = results.filter((r) => r.exitCode === 0);
  const workspaces = new Set(results.map((r) => r.workspace)).size;

  if (failed.length === 0) {
    return `All passed (${passed.length} check${passed.length === 1 ? '' : 's'} across ${workspaces} workspace${workspaces === 1 ? '' : 's'})`;
  }

  const first = failed[0];
  return `${failed.length} failed, ${passed.length} passed (${first.workspace} ${first.kind} exit ${first.exitCode})`;
}

/**
 * How many trailing lines of stderr/stdout each failure surfaces in the
 * fix prompt. tsc / eslint output is dense — 40 lines is enough to see
 * the actionable error chain (typically the deepest cause + its call
 * sites) without spending tokens on the unrelated noise above it.
 */
const FIX_PROMPT_TAIL_LINES = 40;

/**
 * Render the follow-up user message the runner pushes back into the SDK
 * session when validation fails. The agent must NOT run lint/tsc itself
 * (those Bash patterns stay denied in `agent/can-use-tool.ts`); it only
 * edits the offending files in response to the structured failures
 * surfaced here. The wizard CLI re-validates after the agent ends its
 * turn, so the loop converges without giving the agent any way to call
 * a validator on its own.
 */
export function buildFixValidationPrompt(failures: ValidationResult[], attempt: number): string {
  const workspaces = new Set(failures.map((f) => f.workspace)).size;
  const lines: string[] = [];
  lines.push(
    `The wizard's lint+typecheck pass found ${failures.length} failure${failures.length === 1 ? '' : 's'}` +
      ` across ${workspaces} workspace${workspaces === 1 ? '' : 's'}. Fix them MINIMALLY by editing the offending files.`
  );
  lines.push('');
  lines.push('Hard rules for this turn:');
  lines.push(
    '- DO NOT run lint, tsc, eslint, prettier, biome, jest, vitest, or any test/format command — those are blocked. The wizard CLI re-runs validation after you end this turn.'
  );
  lines.push('- DO NOT touch unrelated files. Only edit files surfaced below.');
  lines.push('- DO NOT change `package.json` scripts to silence errors. Fix the actual code.');
  lines.push('- End your turn as soon as the edits are made. No summary message needed.');
  lines.push('');
  lines.push(`Attempt ${attempt} of the fix loop. Failures:`);
  lines.push('');

  for (const failure of failures) {
    const exitDescriptor = failure.timedOut ? 'timed out' : `exit ${failure.exitCode}`;
    lines.push(`### ${failure.workspace} — ${failure.kind} (${failure.command}, ${exitDescriptor})`);
    const tail = failure.stderrTail.trim() || failure.stdoutTail.trim();
    if (tail) {
      lines.push('');
      lines.push('```');
      lines.push(...tail.split(/\r?\n/).slice(-FIX_PROMPT_TAIL_LINES));
      lines.push('```');
    } else {
      lines.push('');
      lines.push('_(no captured output — re-run the command locally if you need more context)_');
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
