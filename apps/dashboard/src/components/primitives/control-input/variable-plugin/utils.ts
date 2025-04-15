export function isTypingVariable(content: string, pos: number): boolean {
  const beforeCursor = content.slice(0, pos);
  const afterCursor = content.slice(pos);
  const lastOpenBrackets = beforeCursor.lastIndexOf('{{');
  const nextCloseBrackets = afterCursor.indexOf('}}');

  return lastOpenBrackets !== -1 && (nextCloseBrackets === -1 || beforeCursor.indexOf('}}', lastOpenBrackets) === -1);
}
