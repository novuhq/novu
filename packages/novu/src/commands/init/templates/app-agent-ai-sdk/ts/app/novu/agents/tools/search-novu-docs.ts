import { z } from 'zod';

const NOVU_DOCS_INDEX_URL = 'https://docs.novu.co/llms.txt';

export const searchNovuDocsInputSchema = z.object({
  query: z.string().describe('Topic to search for in Novu docs'),
});

export async function searchNovuDocsIndex(query: string): Promise<string[]> {
  const response = await fetch(NOVU_DOCS_INDEX_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch Novu docs index (${response.status})`);
  }

  const needle = query.toLowerCase();

  return (await response.text())
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.toLowerCase().includes(needle))
    .slice(0, 5);
}
