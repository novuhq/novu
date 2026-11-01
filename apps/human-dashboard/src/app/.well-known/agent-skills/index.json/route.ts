import { skillsIndex } from '@/lib/agent-skills';

// Made when the site is built, then again at most once an hour, so a change to the skills on GitHub shows
// without a deploy.
export const dynamic = 'force-static';
export const revalidate = 3600;

/** The Agent Skills discovery index, which `npx skills add https://www.agentinbox.md` reads. */
export async function GET() {
  return Response.json(await skillsIndex(), { headers: { 'Access-Control-Allow-Origin': '*' } });
}
