import { getApiBaseUrl, post } from './api.client';

export type MintlifySearchResult = {
  content: string;
  path: string;
  metadata?: {
    title?: string;
    description?: string;
  };
};

export function getDocsAssistantMessageUrl(): string {
  return `${getApiBaseUrl()}/v1/support/docs-assistant/message`;
}

export async function searchDocs(query: string, pageSize = 8): Promise<MintlifySearchResult[]> {
  const response = await post<{ data: MintlifySearchResult[] }>('/support/docs-assistant/search', {
    body: { query, pageSize },
  });

  return response.data ?? [];
}
