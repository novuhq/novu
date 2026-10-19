import path from 'node:path';

const MAX_LABEL = 64;

export interface ToolLabelInfo {
  short: string;
  full: string;
}

export interface ExtractToolLabelOptions {
  /**
   * Project root used to render file-path labels as paths relative to the
   * user's project (e.g. `app/api/checkout/route.ts`) instead of just the
   * file basename. When omitted, the label falls back to the basename so
   * call sites that don't know the cwd remain backward-compatible.
   */
  cwd?: string;
}

export function extractToolLabel(
  toolName: string,
  input: unknown,
  options: ExtractToolLabelOptions = {}
): ToolLabelInfo {
  if (!input || typeof input !== 'object') {
    return { short: '', full: '' };
  }

  const data = input as Record<string, unknown>;

  if (toolName === 'Read' || toolName === 'Write' || toolName === 'Edit') {
    const filePath = stringField(data.file_path);
    if (filePath) {
      return clamp(toProjectRelativeLabel(filePath, options.cwd), filePath);
    }
  }

  if (toolName === 'Bash') {
    const command = stringField(data.command);
    if (command) {
      const compact = command.replace(/\s+/g, ' ').trim();

      return clamp(compact, command);
    }
  }

  if (toolName === 'Glob' || toolName === 'Grep') {
    const pattern = stringField(data.pattern) ?? stringField(data.glob);
    if (pattern) return clamp(pattern, pattern);
  }

  if (toolName === 'WebFetch') {
    const url = stringField(data.url);
    if (url) return clamp(url, url);
  }

  if (toolName === 'Skill') {
    const skill = stringField(data.skill) ?? stringField(data.name) ?? stringField(data.command)?.replace(/^\//, '');
    if (skill) return clamp(skill, skill);
  }

  if (toolName === 'ListMcpResourcesTool') {
    const server = stringField(data.server);
    if (server) return clamp(server, server);

    return clamp('all servers', 'all servers');
  }

  if (toolName === 'Task' || toolName === 'Agent') {
    const subagentType = stringField(data.subagent_type);
    const description = stringField(data.description);
    const label = subagentType ?? description ?? '';
    if (label) return clamp(label, label);
  }

  if (toolName.startsWith('mcp__')) {
    const candidate =
      stringField(data.name) ??
      stringField(data.identifier) ??
      stringField(data.workflowId) ??
      stringField(data.workflow_id) ??
      stringField(data.subscriberId) ??
      stringField(data.id);
    if (candidate) return clamp(candidate, candidate);
  }

  const fallback = JSON.stringify(input);

  return clamp(fallback, fallback);
}

export function shortenToolName(name: string): string {
  if (!name.startsWith('mcp__')) return name;
  const parts = name.split('__');
  if (parts.length < 3) return name;

  return `mcp:${parts.slice(1).join('.')}`;
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function toProjectRelativeLabel(filePath: string, cwd: string | undefined): string {
  if (!cwd) return path.basename(filePath);
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);
  const relative = path.relative(cwd, absolute);
  if (relative === '') return path.basename(filePath);

  return relative;
}

function clamp(short: string, full: string): ToolLabelInfo {
  return {
    short: short.length > MAX_LABEL ? `${short.slice(0, MAX_LABEL - 1)}\u2026` : short,
    full,
  };
}
