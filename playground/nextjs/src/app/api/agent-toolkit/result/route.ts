import { pendingApprovals } from '../lib/toolkit';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const toolCallId = url.searchParams.get('toolCallId');

  if (!toolCallId) {
    return Response.json({ error: 'Missing toolCallId' }, { status: 400 });
  }

  const approval = pendingApprovals.get(toolCallId);

  if (!approval || approval.result === undefined) {
    return Response.json({ resolved: false });
  }

  return Response.json({ resolved: true, result: approval.result });
}
