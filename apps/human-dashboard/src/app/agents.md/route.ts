import { agentsMarkdown } from '@/lib/agents-md';

// Made once, when the site is built.
export const dynamic = 'force-static';

/** What agents read: the instructions the connect prompt links to, as Markdown. */
export function GET() {
  return new Response(agentsMarkdown(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
