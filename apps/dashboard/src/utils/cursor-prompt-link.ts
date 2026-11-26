/** Cursor deep link that opens `prompt` in a new chat. */
export function buildCursorPromptLink(prompt: string): string {
  // encodeURIComponent leaves these as they are, and Cursor's link parser doesn't accept them raw.
  const encoded = encodeURIComponent(prompt).replace(
    /[!'()*~]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );

  return `https://cursor.com/link/prompt?text=${encoded}`;
}
