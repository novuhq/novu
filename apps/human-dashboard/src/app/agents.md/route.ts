import { agentsMarkdown } from '@/lib/agents-md';

// Made when the site is built, then again at most once an hour, so a change to the skill on GitHub shows
// without a deploy.
export const dynamic = 'force-static';
export const revalidate = 3600;

/** What agents read: the instructions the connect prompt links to, as Markdown. */
export async function GET() {
  return new Response(await agentsMarkdown(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
