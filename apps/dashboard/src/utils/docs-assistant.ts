const DOCS_ASSISTANT_BASE_URL = 'https://docs.novu.co/platform';

export function getDocsAssistantUrl(query?: string): string {
  const trimmedQuery = query?.trim();

  if (!trimmedQuery) {
    return `${DOCS_ASSISTANT_BASE_URL}?assistant`;
  }

  return `${DOCS_ASSISTANT_BASE_URL}?assistant=${encodeURIComponent(trimmedQuery)}`;
}

export function openDocsAssistant(query?: string): void {
  window.open(getDocsAssistantUrl(query), '_blank', 'noopener,noreferrer');
}
