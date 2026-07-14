export const MCP_TOOL_APPROVAL_ACTION_PREFIX = 'mcp-approval' as const;
export const DIRECT_TOOL_APPROVAL_ACTION_PREFIX = 'direct-approval' as const;

export type ToolApprovalActionPrefix =
  | typeof MCP_TOOL_APPROVAL_ACTION_PREFIX
  | typeof DIRECT_TOOL_APPROVAL_ACTION_PREFIX;

export type ToolTrustTarget =
  | { scope: 'tool'; toolName: string; mcpServerName?: string }
  | { scope: 'server'; mcpServerName: string };

export type ParsedToolApprovalAction = {
  toolUseId: string;
  approved: boolean;
  trust?: ToolTrustTarget;
};

export function buildToolApprovalActionId(
  prefix: ToolApprovalActionPrefix,
  verdict: 'approve' | 'deny',
  toolUseId: string
): string {
  return `${prefix}:${verdict}:${toolUseId}`;
}

/**
 * Builds a persist ("always allow") action id — the ids parsed by
 * `parseToolApprovalActionId` as `approve-tool` / `approve-server`.
 *
 * Format: `{prefix}:{verdict}:{toolUseId}:{enc(toolName)}[:{enc(mcpServerName)}]`.
 * The trailing `mcpServerName` segment is emitted only for the MCP prefix, so
 * MCP ids always carry both trailing segments (matching the parser, which reads
 * the server name from the last segment for both `approve-tool` and
 * `approve-server`). Keep this in sync with `parseToolApprovalActionId`.
 */
export function buildToolTrustApprovalActionId(params: {
  prefix: ToolApprovalActionPrefix;
  verdict: 'approve-tool' | 'approve-server';
  toolUseId: string;
  toolName: string;
  mcpServerName?: string;
}): string {
  const segments = [params.prefix, params.verdict, params.toolUseId, encodeURIComponent(params.toolName)];

  if (params.prefix === MCP_TOOL_APPROVAL_ACTION_PREFIX) {
    segments.push(encodeURIComponent(params.mcpServerName ?? ''));
  }

  return segments.join(':');
}

const TOOL_APPROVAL_VERDICTS = ['approve', 'deny', 'approve-tool', 'approve-server'] as const;
type ToolApprovalVerdict = (typeof TOOL_APPROVAL_VERDICTS)[number];

function isToolApprovalPrefix(value: string | undefined): value is ToolApprovalActionPrefix {
  return value === MCP_TOOL_APPROVAL_ACTION_PREFIX || value === DIRECT_TOOL_APPROVAL_ACTION_PREFIX;
}

function isToolApprovalVerdict(value: string | undefined): value is ToolApprovalVerdict {
  return TOOL_APPROVAL_VERDICTS.includes(value as ToolApprovalVerdict);
}

function decodeSegment(segment: string | undefined): string | undefined {
  if (!segment) {
    return undefined;
  }

  try {
    return decodeURIComponent(segment) || undefined;
  } catch {
    // Malformed percent-encoding: ignore the segment rather than throwing and
    // breaking the whole approval action handler.
    return undefined;
  }
}

/**
 * Action ids are colon-joined: `{prefix}:{verdict}:{toolUseId}[:{toolName}[:{mcpServerName}]]`.
 * `toolName` / `mcpServerName` are URL-encoded, so they never contain a colon.
 *
 * The persist-verdict ids (`approve-tool` / `approve-server`) are produced by the
 * managed card builders in `managed-runtime/tool-approval/managed-approval.ts`;
 * keep this parser in sync with those builders.
 */
export function parseToolApprovalActionId(id: string | undefined): ParsedToolApprovalAction | null {
  const [prefix, verdict, toolUseId, rawToolName, rawServerName, ...rest] = (id ?? '').split(':');

  if (rest.length > 0 || !isToolApprovalPrefix(prefix) || !isToolApprovalVerdict(verdict) || !toolUseId) {
    return null;
  }

  const toolName = decodeSegment(rawToolName);
  const mcpServerName = decodeSegment(rawServerName);
  const approved = verdict !== 'deny';
  // The trust *source* is bound to the action prefix, never inferred from the
  // segments present. This prevents a forged/mismatched action id (e.g. a
  // direct prefix with `approve-server`) from persisting MCP server-wide trust.
  const isMcp = prefix === MCP_TOOL_APPROVAL_ACTION_PREFIX;

  switch (verdict) {
    case 'approve':
    case 'deny':
      return { toolUseId, approved };
    // Persist verdicts are only ever emitted by our cards with all required
    // segments present. A missing/undecodable segment therefore means a
    // malformed or forged id, so we reject it (fail closed: no approval, no
    // persist) rather than downgrading it to a one-off approval.
    case 'approve-tool': {
      // MCP per-tool trust must carry its server; direct tool trust must not.
      if (isMcp) {
        if (!toolName || !mcpServerName) {
          return null;
        }

        return { toolUseId, approved, trust: { scope: 'tool', toolName, mcpServerName } };
      }

      if (!toolName) {
        return null;
      }

      return { toolUseId, approved, trust: { scope: 'tool', toolName } };
    }
    case 'approve-server': {
      // Server-wide trust only exists on MCP cards.
      if (!isMcp || !mcpServerName) {
        return null;
      }

      return { toolUseId, approved, trust: { scope: 'server', mcpServerName } };
    }
    default: {
      const exhaustive: never = verdict;
      throw new Error(`Unhandled tool approval verdict: ${exhaustive}`);
    }
  }
}
