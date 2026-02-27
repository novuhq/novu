import { pendingApprovals } from '../lib/toolkit';

export async function GET() {
  const items = Array.from(pendingApprovals.values()).filter((p) => !p.decision);

  return Response.json({ pending: items });
}
