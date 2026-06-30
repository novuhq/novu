const PREFIX = 'tool-approval' as const;
type Verdict = 'approve' | 'deny';

export interface ApprovalPayload {
  approvalId: string;
  toolCallId: string;
  name: string;
  input?: Record<string, unknown>;
}

export interface ParsedApprovalAction {
  approved: boolean;
  payload: ApprovalPayload;
}

function isVerdict(value: string | undefined): value is Verdict {
  return value === 'approve' || value === 'deny';
}

function toBase64Url(json: string): string {
  const b64 = typeof Buffer !== 'undefined' ? Buffer.from(json, 'utf8').toString('base64') : btoa(json);

  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');

  return typeof Buffer !== 'undefined' ? Buffer.from(b64, 'base64').toString('utf8') : atob(b64);
}

export function buildApprovalActionId(verdict: Verdict, payload: ApprovalPayload): string {
  return `${PREFIX}:${verdict}:${toBase64Url(JSON.stringify(payload))}`;
}

export function parseApprovalActionId(id: string | undefined): ParsedApprovalAction | null {
  const [prefix, verdict, encoded, ...rest] = (id ?? '').split(':');
  if (rest.length > 0 || prefix !== PREFIX || !isVerdict(verdict) || !encoded) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as ApprovalPayload;
    if (!payload || typeof payload.approvalId !== 'string' || typeof payload.name !== 'string') {
      return null;
    }

    return { approved: verdict === 'approve', payload };
  } catch {
    return null;
  }
}
