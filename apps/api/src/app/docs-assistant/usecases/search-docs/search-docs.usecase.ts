import { Injectable, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { SearchDocsCommand } from './search-docs.command';

const MINTLIFY_DISCOVERY_BASE_URL = 'https://api.mintlify.com/discovery';

export type MintlifySearchResult = {
  content: string;
  path: string;
  metadata?: {
    title?: string;
    description?: string;
  };
};

@Injectable()
export class SearchDocsUsecase {
  async execute(command: SearchDocsCommand): Promise<MintlifySearchResult[]> {
    const apiKey = process.env.MINTLIFY_ASSISTANT_KEY;
    const domain = process.env.MINTLIFY_DOMAIN;

    if (!apiKey || !domain) {
      throw new ServiceUnavailableException('Docs assistant is not configured');
    }

    const upstream = await fetch(`${MINTLIFY_DISCOVERY_BASE_URL}/v1/search/${domain}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: command.query,
        pageSize: command.pageSize ?? 8,
      }),
    });

    if (!upstream.ok) {
      const errorBody = await safeReadJson(upstream);

      throw new InternalServerErrorException(errorBody ?? { message: 'Mintlify search request failed' });
    }

    const results = (await upstream.json()) as MintlifySearchResult[];

    return Array.isArray(results) ? results : [];
  }
}

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
