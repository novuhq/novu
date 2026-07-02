const HEALTH_CHECK_ACTION = 'health-check';
const DISCOVER_ACTION = 'discover';

export function handleBridgeProbe(request: Request, agentIdentifier: string): Response | null {
  if (request.method !== 'GET') {
    return null;
  }

  const action = new URL(request.url).searchParams.get('action');

  if (action === HEALTH_CHECK_ACTION) {
    return Response.json({ status: 'ok' });
  }

  if (action === DISCOVER_ACTION) {
    return Response.json({
      workflows: [],
      agents: [{ agentId: agentIdentifier }],
    });
  }

  return null;
}
