import type { UploadSkillFile } from '@novu/application-generic';

export type InlineSkillBundle = {
  files: UploadSkillFile[];
  /**
   * Display title for the provider, derived from the `name` field in the
   * SKILL.md YAML frontmatter. `undefined` when frontmatter is missing or
   * malformed — the provider's own validation will then surface a 400 with
   * a user-facing message before any network call is made.
   */
  displayTitle: string | undefined;
};

/**
 * Wraps the user-pasted SKILL.md text as a single-file skill bundle suitable for
 * `IAgentRuntimeProvider.uploadSkill`. Mirrors the shape produced by
 * {@link extractSkillBundle} in `github-skill-bundle.ts`, but for the inline
 * source variant where no archive download is involved.
 *
 * The `displayTitle` is derived from the YAML frontmatter `name` so that
 * repeated inline uploads of the same skill collide on the provider's
 * `display_title` and trigger the existing auto-version branch.
 */
export function buildInlineSkillBundle(content: string): InlineSkillBundle {
  const files: UploadSkillFile[] = [{ path: 'SKILL.md', content: Buffer.from(content, 'utf8') }];
  const displayTitle = parseSkillNameFromFrontmatter(content) ?? undefined;

  return { files, displayTitle };
}

/**
 * Reads the `name` field from the YAML frontmatter of a SKILL.md document.
 *
 * Intentionally narrow — only handles the simple `key: value` shape we expect
 * for `name`; anything richer (quoted strings, multi-line scalars) is not
 * supported here and would be rejected upstream by the provider's stricter
 * validation. Returns `null` when frontmatter is missing or has no `name:`.
 */
function parseSkillNameFromFrontmatter(content: string): string | null {
  const normalized = content.replace(/^\uFEFF/, '');
  const frontmatter = normalized.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);

  if (!frontmatter) {
    return null;
  }

  const nameMatch = frontmatter[1].match(/^[ \t]*name[ \t]*:[ \t]*(.+?)[ \t]*$/m);

  if (!nameMatch) {
    return null;
  }

  const value = nameMatch[1].trim();

  return value.length > 0 ? value : null;
}
