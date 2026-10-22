import 'server-only';

import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

import { SKILLS_REPO } from './onboarding';
import { readTar, type TarFile, writeTar } from './tar';

/**
 * Agent Skills discovery 0.2.0, which `npx skills add https://www.agentinbox.md` reads:
 * https://github.com/cloudflare/agent-skills-discovery-rfc
 */
const DISCOVERY_SCHEMA = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json';

/** Where the index is, and under it each skill's download, in a folder named after its commit. */
const AGENT_SKILLS_PATH = '/.well-known/agent-skills';

/** How long to wait for GitHub's archive of the skills repository. */
const FETCH_TIMEOUT_MS = 10_000;

/** A skill name as the Agent Skills spec allows it: up to 64 lowercase letters, digits and single hyphens. */
const SKILL_NAME = /^(?=.{1,64}$)[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COMMIT = /^[0-9a-f]{40}$/;
/** Where YAML reads a one-line value differently from its text: quotes, `>` or `|` for several lines, comments. */
const YAML_SYNTAX = /^[-?:,[\]{}#&*!|>'"%@`]|: | #|:$/;

/** A commit's skills never change, so clients and the CDN keep them for a year. Any site may read them. */
export const SKILL_DOWNLOAD_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
};

export interface Skill {
  name: string;
  description: string;
  /** `skill-md` when the skill is only its SKILL.md, `archive` when it has more files. */
  type: 'skill-md' | 'archive';
  /** What a client downloads: the SKILL.md itself, or the skill's folder as a .tar.gz. */
  artifact: Buffer;
}

interface SkillsAtCommit {
  commit: string;
  skills: Skill[];
}

/**
 * `/.well-known/agent-skills/index.json`: the skills on `main` of the skills repository. Each entry points at its
 * download under the commit it was made from, so a client holding an older index still gets the bytes its digest
 * describes.
 */
export async function skillsIndex() {
  const repository = await skillsOnMain();
  const skills = repository
    ? repository.skills.map((skill) => ({
        name: skill.name,
        type: skill.type,
        description: skill.description,
        url:
          skill.type === 'archive'
            ? `${AGENT_SKILLS_PATH}/${repository.commit}/${skill.name}.tar.gz`
            : `${AGENT_SKILLS_PATH}/${repository.commit}/${skill.name}/SKILL.md`,
        digest: `sha256:${createHash('sha256').update(skill.artifact).digest('hex')}`,
      }))
    : [];

  return { $schema: DISCOVERY_SCHEMA, skills };
}

/** The skill `name` as it was at `commit`, or `null` when GitHub has no such commit, or the commit no such skill. */
export async function findSkill(commit: string, name: string): Promise<Skill | null> {
  if (!COMMIT.test(commit)) return null;
  const repository = await loadSkills(commit);

  return repository?.skills.find((skill) => skill.name === name) ?? null;
}

/**
 * The skills on `main`, or `null` while the repository has none. When GitHub fails during the build, the site
 * builds with no skills, which the next hourly refresh fills in. After the build, the error keeps the index
 * made last until GitHub answers again.
 */
async function skillsOnMain(): Promise<SkillsAtCommit | null> {
  try {
    return await loadSkills('refs/heads/main');
  } catch (error) {
    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) throw error;
    console.warn('The skills index is built without skills, because GitHub failed:', error);

    return null;
  }
}

/**
 * The skills in `skills/` of the skills repository at `ref`, a branch or a commit, from the archive GitHub makes of
 * it. `null` when GitHub has no such ref.
 */
async function loadSkills(ref: string): Promise<SkillsAtCommit | null> {
  const response = await fetch(`https://codeload.github.com/${SKILLS_REPO}/tar.gz/${ref}`, {
    // A commit's archive never changes. A branch's does, and each hourly refresh of the index wants the latest.
    cache: COMMIT.test(ref) ? 'force-cache' : 'no-store',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub answered ${response.status} for ${SKILLS_REPO} at ${ref}`);

  const { files, comment } = readTar(gunzipSync(Buffer.from(await response.arrayBuffer())));
  // `git archive` names the commit in the archive, and GitHub's archives are made with it.
  if (!comment || !COMMIT.test(comment)) {
    throw new Error(`GitHub's archive of ${SKILLS_REPO} at ${ref} names no commit`);
  }

  return { commit: comment, skills: skillsIn(files) };
}

/** Each folder in `skills/` with a SKILL.md that has a description, as the download a client gets. */
function skillsIn(files: TarFile[]): Skill[] {
  const folders = new Map<string, TarFile[]>();
  for (const file of files) {
    // GitHub puts everything in one folder named after the repository and ref, such as `skills-main/`.
    const match = /^[^/]+\/skills\/([^/]+)\/(.+)$/.exec(file.path);
    if (match) folders.set(match[1], [...(folders.get(match[1]) ?? []), { path: match[2], content: file.content }]);
  }

  const skills: Skill[] = [];
  for (const [name, skillFiles] of folders) {
    const skillMd = skillFiles.find((file) => file.path === 'SKILL.md');
    if (!skillMd) continue;

    const description = descriptionOf(skillMd.content.toString('utf8'));
    if (!description || description.length > 1024 || !SKILL_NAME.test(name)) {
      console.warn(`The skills index leaves out skills/${name}: it needs a spec name and a one-line description`);
      continue;
    }

    skills.push(
      skillFiles.length === 1
        ? { name, description, type: 'skill-md', artifact: skillMd.content }
        : { name, description, type: 'archive', artifact: gzipSync(writeTar(skillFiles)) }
    );
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The `description` in a SKILL.md's front matter. The skills repository's checks keep every field on one line,
 * written so that YAML reads it as it stands, and this reads only that form. A description YAML would read
 * differently, such as a quoted one or one over several lines, counts as none, rather than being published wrong.
 */
function descriptionOf(skillMd: string): string | null {
  const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(skillMd)?.[1];
  const description = frontMatter?.match(/^description: (.+)$/m)?.[1].trim();

  return description && !YAML_SYNTAX.test(description) ? description : null;
}
