import { hostMarkdown } from '@/lib/host-markdown';
import { HOST_IDS, hostOf, hostPath, isHostId } from '@/lib/hosts';
import { SITE_ORIGIN } from '@/lib/seo';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return HOST_IDS.map((host) => ({ host }));
}

/**
 * A host's page as Markdown, for agents: `/claude-code.md`, which `next.config.ts` rewrites to here, as
 * `/index.md` is the home page's.
 */
export async function GET(_request: Request, { params }: RouteContext<'/[host]/index.md'>) {
  const { host } = await params;
  if (!isHostId(host)) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(hostMarkdown(hostOf(host)), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Link: `<${SITE_ORIGIN}${hostPath(host)}>; rel="canonical", <${SITE_ORIGIN}/llms.txt>; rel="describedby"`,
    },
  });
}
