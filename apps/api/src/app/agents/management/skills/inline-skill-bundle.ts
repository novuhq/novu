import type { UploadSkillFile } from '@novu/application-generic';

import { parseSkillNameFromFrontmatter } from './github-skill-bundle';

export type InlineSkillBundle = {
  files: UploadSkillFile[];
  /**
   * Display title for the provider, derived from the `name` field in the
   * SKILL.md YAML frontmatter. `undefined` when frontmatter is missing or
   * malformed — the provider's own validation will then surface a 400 with
   * a user-facing message before any network call is made.
   */
  displayTitle: string | undefined;
  /** Value of the `name:` field in SKILL.md frontmatter, or `null` when missing/malformed. */
  name: string | null;
};

/**
 * Wraps the user-pasted SKILL.md text as a single-file skill bundle suitable for
 * `IAgentRuntimeProvider.uploadSkill`. Mirrors the shape produced by
 * {@link fetchAndExtractSkillBundle} in `github-skill-bundle.ts`, but for the
 * inline source variant where no archive download is involved.
 *
 * The `displayTitle` is derived from the YAML frontmatter `name` so that
 * repeated inline uploads of the same skill collide on the provider's
 * `display_title` and trigger the existing auto-version branch.
 */
export function buildInlineSkillBundle(content: string): InlineSkillBundle {
  const files: UploadSkillFile[] = [{ path: 'SKILL.md', content: Buffer.from(content, 'utf8') }];
  const name = parseSkillNameFromFrontmatter(content);

  return { files, displayTitle: name ?? undefined, name };
}
