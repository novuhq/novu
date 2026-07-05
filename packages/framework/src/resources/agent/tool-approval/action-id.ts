const PREFIX = 'tool-approval' as const;
type Verdict = 'approve' | 'deny';

export interface ToolApprovalRequestPayload {
  approvalId: string;
  toolCallId: string;
  name: string;
  input?: Record<string, unknown>;
}

export interface ParsedApprovalAction {
  approved: boolean;
  approvalId: string;
}

function isVerdict(value: string | undefined): value is Verdict {
  return value === 'approve' || value === 'deny';
}

// Kept tiny (`tool-approval:{verdict}:{approvalId}`) to stay under platform action-id
// limits, e.g. Slack's 255 chars. The tool payload lives in richContent, not here.
export function buildApprovalActionId(verdict: Verdict, approvalId: string): string {
  return `${PREFIX}:${verdict}:${approvalId}`;
}

export function parseApprovalActionId(id: string | undefined): ParsedApprovalAction | null {
  const [prefix, verdict, ...idParts] = (id ?? '').split(':');
  const approvalId = idParts.join(':'); // approvalId is opaque and may contain ':'
  if (prefix !== PREFIX || !isVerdict(verdict) || !approvalId) {
    return null;
  }

  return { approved: verdict === 'approve', approvalId };
}
