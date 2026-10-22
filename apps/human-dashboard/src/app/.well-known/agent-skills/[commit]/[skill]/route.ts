import { findSkill, SKILL_DOWNLOAD_HEADERS } from '@/lib/agent-skills';

const ARCHIVE = '.tar.gz';

/**
 * A skill with more files than its SKILL.md, as a .tar.gz of its folder: `<commit>/<name>.tar.gz`. Here the
 * `[skill]` segment is that file name. It shares the segment with `<commit>/<name>/SKILL.md`.
 */
export async function GET(_request: Request, { params }: RouteContext<'/.well-known/agent-skills/[commit]/[skill]'>) {
  const { commit, skill: file } = await params;
  const skill = file.endsWith(ARCHIVE) ? await findSkill(commit, file.slice(0, -ARCHIVE.length)) : null;
  if (skill?.type !== 'archive') return new Response('Not found', { status: 404 });

  return new Response(new Uint8Array(skill.artifact), {
    headers: { 'Content-Type': 'application/gzip', ...SKILL_DOWNLOAD_HEADERS },
  });
}
