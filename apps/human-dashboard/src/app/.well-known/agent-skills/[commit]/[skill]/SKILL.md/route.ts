import { artifactOf, findSkill, SKILL_DOWNLOAD_HEADERS } from '@/lib/agent-skills';

/** A skill that is only its SKILL.md: `<commit>/<name>/SKILL.md`. */
export async function GET(
  _request: Request,
  { params }: RouteContext<'/.well-known/agent-skills/[commit]/[skill]/SKILL.md'>
) {
  const { commit, skill: name } = await params;
  const skill = await findSkill(commit, name);
  if (skill?.type !== 'skill-md') return new Response('Not found', { status: 404 });

  return new Response(new Uint8Array(artifactOf(skill)), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', ...SKILL_DOWNLOAD_HEADERS },
  });
}
