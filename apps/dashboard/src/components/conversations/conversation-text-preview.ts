const FENCE_LINE = /^[ \t]*(?:`{3,}|~{3,}).*$/gm;
const HEADING_MARKER = /^[ \t]{0,3}#{1,6}[ \t]+/gm;
const BLOCKQUOTE_MARKER = /^[ \t]*>[ \t]?/gm;
const BULLET_MARKER = /^[ \t]*[-*+][ \t]+/gm;
const IMAGE = /!\[([^\]]*)\]\([^)]*\)/g;
const LINK = /\[([^\]]+)\]\([^)]*\)/g;
const EMPHASIS = /(\*\*|~~)(.+?)\1/g;
const INLINE_CODE = /`([^`]+)`/g;
const WHITESPACE = /\s+/g;

/**
 * Flattens Markdown into a single line of plain text for one-line previews (list titles,
 * collapsed timeline messages), so truncation never cuts through block syntax.
 */
export function toPlainTextPreview(markdown: string): string {
  return markdown
    .replace(FENCE_LINE, '')
    .replace(HEADING_MARKER, '')
    .replace(BLOCKQUOTE_MARKER, '')
    .replace(BULLET_MARKER, '')
    .replace(IMAGE, '$1')
    .replace(LINK, '$1')
    .replace(EMPHASIS, '$2')
    .replace(INLINE_CODE, '$1')
    .replace(WHITESPACE, ' ')
    .trim();
}
