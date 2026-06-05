// Preserves an incoming `?agentTemplateId=` across the auth flow. Clerk performs full-document
// reloads (sign-up -> org-create -> setup) that drop query params, so we stash the value in
// sessionStorage at app boot and read it back on the agent setup page / create-agent dialog.

const AGENT_TEMPLATE_ID_KEY = 'novu.onboarding.agentTemplateId';

export const AGENT_TEMPLATE_ID_PARAM = 'agentTemplateId';

export function persistAgentTemplateId(id: string): void {
  try {
    sessionStorage.setItem(AGENT_TEMPLATE_ID_KEY, id);
  } catch {
    // sessionStorage unavailable — the value will rely on the URL param only
  }
}

export function readPersistedAgentTemplateId(): string | undefined {
  try {
    const raw = sessionStorage.getItem(AGENT_TEMPLATE_ID_KEY)?.trim();

    return raw || undefined;
  } catch {
    return undefined;
  }
}

export function clearPersistedAgentTemplateId(): void {
  try {
    sessionStorage.removeItem(AGENT_TEMPLATE_ID_KEY);
  } catch {
    // ignore
  }
}

export function readActiveAgentTemplateId(urlValue?: string | null): string | undefined {
  if (urlValue !== null && urlValue !== undefined) {
    return urlValue.trim() || undefined;
  }

  return readPersistedAgentTemplateId();
}

// Reads the param from the current URL and persists it. Safe to call at module load on every
// document load — only writes when the param is present.
export function captureAgentTemplateIdFromUrl(): void {
  try {
    const id = new URLSearchParams(window.location.search).get(AGENT_TEMPLATE_ID_PARAM)?.trim();

    if (id) {
      persistAgentTemplateId(id);
    }
  } catch {
    // ignore — no window/search available
  }
}
