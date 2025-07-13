import { CompletionContext } from '@codemirror/autocomplete';
import { TRANSLATION_KEY_SINGLE_REGEX } from '@novu/shared';

export function isTypingTranslation(content: string, pos: number): boolean {
  const beforeCursor = content.slice(0, pos);
  const afterCursor = content.slice(pos);
  const lastOpenBrackets = beforeCursor.lastIndexOf('{t.');
  const nextCloseBrackets = afterCursor.indexOf('}');

  return lastOpenBrackets !== -1 && (nextCloseBrackets === -1 || beforeCursor.indexOf('}', lastOpenBrackets) === -1);
}

export function isInsideVariableContext(context: CompletionContext): boolean {
  const { state, pos } = context;
  const beforeCursor = state.sliceDoc(0, pos);
  const lastOpenBrace = beforeCursor.lastIndexOf('{{');
  const lastCloseBrace = beforeCursor.lastIndexOf('}}');

  return lastOpenBrace !== -1 && (lastCloseBrace === -1 || lastOpenBrace > lastCloseBrace);
}

export function parseTranslation(translation: string): { key: string; fullExpression: string } | undefined {
  if (translation.includes('\n')) return undefined;

  const match = translation.match(TRANSLATION_KEY_SINGLE_REGEX);
  if (!match) return undefined;

  const key = match[1]?.trim();
  if (!key) return undefined;

  return { key, fullExpression: translation };
}

export function formatDisplayKey(translationKey: string): string {
  if (!translationKey) return '';
  const keyParts = translationKey.split('.');
  return keyParts.length >= 2 ? '..' + keyParts.slice(-2).join('.') : translationKey;
}
