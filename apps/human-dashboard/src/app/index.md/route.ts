import { homeMarkdown } from '@/lib/home-markdown';
import { SITE_ORIGIN } from '@/lib/seo';

export const dynamic = 'force-static';

export function GET() {
  return new Response(homeMarkdown(), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Link: `<${SITE_ORIGIN}/>; rel="canonical", <${SITE_ORIGIN}/llms.txt>; rel="describedby"`,
    },
  });
}
