import { SuggestionProvider } from './suggestion-provider';

export type ResolveSuggestionValueParams = {
  currentValue: string;
  triggerIndex: number;
  formattedValue: string;
  provider: Pick<SuggestionProvider, 'name' | 'triggerPattern'>;
};

export type ResolvedSuggestionValue = {
  /** Value to write into the field after accepting a suggestion. */
  value: string;
  /**
   * True when the suggestion replaces the entire field (no free-text prefix).
   * Callers use this for pill mode (`isUrlVariable` / `isLabelVariable`).
   * Mixed text + variable stays as editable free text with liquid `{{ }}`.
   */
  isWholeFieldSuggestion: boolean;
};

/**
 * Builds the next field value when a bubble-menu suggestion is accepted.
 *
 * - Whole-field variable pick → bare path (`payload.foo`) so the field can collapse to a pill.
 * - Mixed text + variable → keep the prefix and insert `{{payload.foo}}` (in-app subject style).
 * - Other providers keep `formatValue` as-is, always preserving any prefix.
 */
export function resolveSuggestionInsertValue({
  currentValue,
  triggerIndex,
  formattedValue,
  provider,
}: ResolveSuggestionValueParams): ResolvedSuggestionValue {
  const beforeTrigger = currentValue.slice(0, triggerIndex);
  const hasPrefix = beforeTrigger.length > 0;

  let insertedValue = formattedValue;

  if (provider.name === 'variable' && hasPrefix) {
    const triggerChar = typeof provider.triggerPattern === 'string' ? provider.triggerPattern : '{{';
    const alreadyWrapped = formattedValue.startsWith(triggerChar) && formattedValue.endsWith('}}');

    insertedValue = alreadyWrapped ? formattedValue : `${triggerChar}${formattedValue}}}`;
  }

  return {
    value: beforeTrigger + insertedValue,
    isWholeFieldSuggestion: !hasPrefix,
  };
}
