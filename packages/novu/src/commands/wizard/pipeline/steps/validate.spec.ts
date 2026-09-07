import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildFixValidationPrompt,
  LINT_SCRIPT_CANDIDATES,
  pickScript,
  readWorkspaceScripts,
  summariseValidation,
  TYPECHECK_SCRIPT_CANDIDATES,
  type ValidationResult,
} from './validate';

function fakeResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    workspace: 'apps/web',
    cwd: '/proj/apps/web',
    kind: 'lint',
    scriptName: 'lint',
    command: 'pnpm run lint',
    exitCode: 0,
    durationMs: 1_234,
    stdoutTail: '',
    stderrTail: '',
    timedOut: false,
    ...overrides,
  };
}

describe('summariseValidation', () => {
  it('reports a skip when no scripts ran', () => {
    expect(summariseValidation([])).toMatch(/skipped/i);
  });

  it('reports an all-passed summary with workspace count', () => {
    const summary = summariseValidation([
      fakeResult({ workspace: 'apps/web', kind: 'lint' }),
      fakeResult({ workspace: 'apps/web', kind: 'typecheck' }),
      fakeResult({ workspace: 'apps/api', kind: 'lint' }),
      fakeResult({ workspace: 'apps/api', kind: 'typecheck' }),
    ]);
    expect(summary).toMatch(/All passed/);
    expect(summary).toMatch(/4 checks/);
    expect(summary).toMatch(/2 workspaces/);
  });

  it('reports the first failure when something exits non-zero', () => {
    const summary = summariseValidation([
      fakeResult({ workspace: 'apps/web', kind: 'lint', exitCode: 0 }),
      fakeResult({ workspace: 'apps/api', kind: 'typecheck', exitCode: 2 }),
      fakeResult({ workspace: 'apps/api', kind: 'lint', exitCode: 0 }),
    ]);
    expect(summary).toMatch(/1 failed, 2 passed/);
    expect(summary).toMatch(/apps\/api typecheck exit 2/);
  });
});

describe('buildFixValidationPrompt', () => {
  it('renders the deny-list reminder, attempt counter, and per-failure block with stderr', () => {
    const prompt = buildFixValidationPrompt(
      [
        fakeResult({
          workspace: 'apps/api',
          kind: 'typecheck',
          command: 'pnpm run check-types',
          exitCode: 2,
          stderrTail: "src/foo.ts(12,5): error TS2322: Type 'number' is not assignable to type 'string'.",
        }),
      ],
      1
    );

    expect(prompt).toMatch(/1 failure across 1 workspace/);
    expect(prompt).toMatch(/Attempt 1/);
    expect(prompt).toMatch(/DO NOT run lint, tsc, eslint/);
    expect(prompt).toMatch(/blocked/);
    expect(prompt).toMatch(/DO NOT touch unrelated files/);
    expect(prompt).toMatch(/DO NOT change `package\.json` scripts/);
    expect(prompt).toMatch(/End your turn/);
    expect(prompt).toMatch(/### apps\/api — typecheck \(pnpm run check-types, exit 2\)/);
    expect(prompt).toMatch(/error TS2322/);
  });

  it('pluralises failures + workspaces and increments the attempt counter', () => {
    const prompt = buildFixValidationPrompt(
      [
        fakeResult({ workspace: 'apps/api', kind: 'lint', exitCode: 1, stderrTail: 'lint error' }),
        fakeResult({ workspace: 'apps/web', kind: 'typecheck', exitCode: 2, stderrTail: 'tsc error' }),
      ],
      3
    );

    expect(prompt).toMatch(/2 failures across 2 workspaces/);
    expect(prompt).toMatch(/Attempt 3/);
  });

  it('flags timed-out failures with "timed out" instead of an exit code', () => {
    const prompt = buildFixValidationPrompt(
      [
        fakeResult({
          workspace: 'apps/api',
          kind: 'typecheck',
          exitCode: -1,
          timedOut: true,
          stderrTail: '',
        }),
      ],
      1
    );

    expect(prompt).toMatch(/timed out/);
    expect(prompt).not.toMatch(/exit -1/);
    expect(prompt).toMatch(/no captured output/);
  });

  it('falls back to stdout tail when stderr is empty', () => {
    const prompt = buildFixValidationPrompt(
      [
        fakeResult({
          workspace: 'apps/web',
          kind: 'lint',
          exitCode: 1,
          stderrTail: '',
          stdoutTail: '   3 problems (3 errors, 0 warnings)\n',
        }),
      ],
      1
    );

    expect(prompt).toMatch(/3 problems/);
  });
});

describe('LINT_SCRIPT_CANDIDATES', () => {
  it('orders the canonical name first and excludes auto-fix variants', () => {
    expect(LINT_SCRIPT_CANDIDATES[0]).toBe('lint');
    expect(LINT_SCRIPT_CANDIDATES).toContain('lint:check');
    expect(LINT_SCRIPT_CANDIDATES).toContain('check:lint');
    expect(LINT_SCRIPT_CANDIDATES).toContain('check');
    // Auto-fix variants would silently mutate the agent's edits — they
    // must not be probed by the validator.
    expect(LINT_SCRIPT_CANDIDATES).not.toContain('lint:fix');
    expect(LINT_SCRIPT_CANDIDATES).not.toContain('lint:write');
  });
});

describe('TYPECHECK_SCRIPT_CANDIDATES', () => {
  it('covers the common typecheck script names without including emit-by-default ones', () => {
    expect(TYPECHECK_SCRIPT_CANDIDATES[0]).toBe('typecheck');
    expect(TYPECHECK_SCRIPT_CANDIDATES).toContain('type-check');
    expect(TYPECHECK_SCRIPT_CANDIDATES).toContain('check-types');
    expect(TYPECHECK_SCRIPT_CANDIDATES).toContain('check:types');
    expect(TYPECHECK_SCRIPT_CANDIDATES).toContain('tsc:check');
    // Plain `tsc` writes build artefacts unless `--noEmit` is set, and
    // `types` is too generic to assume read-only semantics — neither is
    // safe to invoke blindly during validation.
    expect(TYPECHECK_SCRIPT_CANDIDATES).not.toContain('tsc');
    expect(TYPECHECK_SCRIPT_CANDIDATES).not.toContain('types');
  });
});

describe('pickScript', () => {
  it('returns the first candidate present in the scripts record', () => {
    expect(pickScript({ lint: 'biome lint .', check: 'biome check .' }, LINT_SCRIPT_CANDIDATES)).toBe('lint');
  });

  it('falls through to the next candidate when earlier ones are missing', () => {
    expect(pickScript({ check: 'biome check .' }, LINT_SCRIPT_CANDIDATES)).toBe('check');
    expect(pickScript({ 'check:lint': 'biome lint .' }, LINT_SCRIPT_CANDIDATES)).toBe('check:lint');
  });

  it('treats empty / whitespace-only scripts as missing', () => {
    expect(pickScript({ lint: '', check: 'biome check .' }, LINT_SCRIPT_CANDIDATES)).toBe('check');
    expect(pickScript({ lint: '   ', check: 'biome check .' }, LINT_SCRIPT_CANDIDATES)).toBe('check');
  });

  it('returns null when no candidate matches', () => {
    expect(pickScript({ build: 'tsc -b' }, LINT_SCRIPT_CANDIDATES)).toBeNull();
    expect(pickScript({}, TYPECHECK_SCRIPT_CANDIDATES)).toBeNull();
  });

  it('matches typecheck candidates including the namespaced variants', () => {
    expect(pickScript({ 'check:types': 'tsc --noEmit' }, TYPECHECK_SCRIPT_CANDIDATES)).toBe('check:types');
    expect(pickScript({ 'tsc:check': 'tsc --noEmit' }, TYPECHECK_SCRIPT_CANDIDATES)).toBe('tsc:check');
  });
});

describe('readWorkspaceScripts', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-validate-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses scripts out of the workspace package.json', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ scripts: { lint: 'biome lint .', 'check:types': 'tsc --noEmit' } })
    );
    expect(readWorkspaceScripts(tmpDir)).toEqual({ lint: 'biome lint .', 'check:types': 'tsc --noEmit' });
  });

  it('returns an empty record when the file is missing', () => {
    expect(readWorkspaceScripts(tmpDir)).toEqual({});
  });

  it('returns an empty record when the file is malformed JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{ not valid json');
    expect(readWorkspaceScripts(tmpDir)).toEqual({});
  });

  it('returns an empty record when the package.json has no scripts key', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'no-scripts' }));
    expect(readWorkspaceScripts(tmpDir)).toEqual({});
  });
});
