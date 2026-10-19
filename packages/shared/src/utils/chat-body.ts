/**
 * Detects whether a stored chat step `body` is a Maily/TipTap document (block
 * editor format) rather than a plain string. Mirrors the Maily document root
 * shape `{ type: 'doc', content: [] }`. Browser- and Node-safe (no Node APIs).
 */
export function isMailyChatBody(body: string): boolean {
  try {
    const parsed = JSON.parse(body) as unknown;

    if (typeof parsed !== 'object' || parsed === null) {
      return false;
    }

    const doc = parsed as { type?: unknown; content?: unknown };

    return doc.type === 'doc' && Array.isArray(doc.content);
  } catch {
    return false;
  }
}
