/** Temporary debug instrumentation for agent-detail cold-load redirect. Do not ship. */

let agentDetailsRenderSeq = 0;

export function nextAgentDetailsRenderSeq(): number {
  agentDetailsRenderSeq += 1;

  return agentDetailsRenderSeq;
}

export function agentRedirectDebugLog(payload: {
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
}): void {
  const entry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    ...payload,
  };

  // #region agent log
  console.log('[agent-redirect-debug]', JSON.stringify(entry));
  try {
    void fetch('/__agent_redirect_debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignore
  }
  // #endregion
}
