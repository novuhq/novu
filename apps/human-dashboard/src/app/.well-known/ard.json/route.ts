import { ardCatalog } from '@/lib/ard-catalog';

export const dynamic = 'force-static';

/** The Agentic Resource Discovery catalog. AI clients fetch it to find this domain's MCP server and skills. */
export function GET() {
  return Response.json(ardCatalog(), {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
