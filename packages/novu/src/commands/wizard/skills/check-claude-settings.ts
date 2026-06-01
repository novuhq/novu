import fs from 'node:fs';
import path from 'node:path';

/**
 * Settings keys that, if present in `.claude/settings.json`, will override the
 * Wizard LLM-gateway auth (set via `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN`
 * in the SDK env) once we enable `settingSources: ['project']` on the
 * `query()` call.
 *
 * We only *warn* — silently moving the user's settings file aside.
 */
const BLOCKING_ENV_KEYS = ['ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL', 'ANTHROPIC_AUTH_TOKEN'] as const;
const BLOCKING_TOP_LEVEL_KEYS = ['apiKeyHelper'] as const;

const CANDIDATE_PATHS = [path.join('.claude', 'settings.json'), path.join('.claude', 'settings.local.json')];

export interface ClaudeSettingsConflict {
  filePath: string;
  keys: string[];
}

export function detectClaudeSettingsConflicts(cwd: string): ClaudeSettingsConflict[] {
  const conflicts: ClaudeSettingsConflict[] = [];

  for (const relative of CANDIDATE_PATHS) {
    const filePath = path.join(cwd, relative);
    const matched = readBlockingKeys(filePath);
    if (matched.length > 0) {
      conflicts.push({ filePath: relative, keys: matched });
    }
  }

  return conflicts;
}

export function formatClaudeSettingsConflictMessage(conflicts: ClaudeSettingsConflict[]): string {
  if (conflicts.length === 0) return '';

  const parts = conflicts.map(({ filePath, keys }) => `${filePath} (${keys.join(', ')})`);

  return `detected Claude Code settings that may override Wizard's LLM gateway auth: ${parts.join('; ')}. Remove or comment out these keys if the agent fails to authenticate.`;
}

function readBlockingKeys(filePath: string): string[] {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!parsed || typeof parsed !== 'object') return [];
  const root = parsed as Record<string, unknown>;
  const matched: string[] = [];

  const envBlock = root.env;
  if (envBlock && typeof envBlock === 'object') {
    const envRecord = envBlock as Record<string, unknown>;
    for (const key of BLOCKING_ENV_KEYS) {
      if (key in envRecord) matched.push(`env.${key}`);
    }
  }

  for (const key of BLOCKING_TOP_LEVEL_KEYS) {
    const value = root[key];
    if (value !== undefined && value !== null && value !== '') {
      matched.push(key);
    }
  }

  return matched;
}
