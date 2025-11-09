import { TRANSLATION_KEY_SINGLE_REGEX } from '@novu/shared';
import { Decoration, DecorationSet, EditorView, Range } from '@uiw/react-codemirror';
import { MutableRefObject } from 'react';
import { validateTranslationKey } from '@/hooks/use-translation-validation';
import { TranslationKey } from '@/types/translations';
import { TranslationPillWidget } from './pill-widget';
import { isTypingTranslation, parseTranslation } from './utils';

export class TranslationPluginView {
  decorations: DecorationSet;
  lastCursor: number = 0;
  isTypingTranslation: boolean = false;

  constructor(
    view: EditorView,
    private viewRef: MutableRefObject<EditorView | null>,
    private lastCompletionRef: MutableRefObject<{ from: number; to: number } | null>,
    private onSelect?: (translationKey: string, from: number, to: number) => void,
    private translationKeys?: TranslationKey[],
    private isTranslationKeysLoading?: boolean
  ) {
    this.decorations = this.createDecorations(view);
    viewRef.current = view;
  }

  update(update: any) {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      const pos = update.state.selection.main.head;
      const content = update.state.doc.toString();

      this.isTypingTranslation = isTypingTranslation(content, pos);
      this.decorations = this.createDecorations(update.view);
    }

    if (update.view) {
      this.viewRef.current = update.view;
    }
  }

  private validateTranslationKeyLocal(translationKey: string): { hasError: boolean; errorMessage?: string } {
    const result = validateTranslationKey(translationKey, this.translationKeys || [], this.isTranslationKeysLoading);

    return {
      hasError: result.hasError,
      errorMessage: result.hasError ? result.errorMessage : undefined,
    };
  }

  createDecorations(view: EditorView) {
    const decorations: Range<Decoration>[] = [];
    const content = view.state.doc.toString();
    const pos = view.state.selection.main.head;
    const regex = new RegExp(TRANSLATION_KEY_SINGLE_REGEX.source, 'g');

    let match: RegExpExecArray | null = null;

    while ((match = regex.exec(content)) !== null) {
      const parsedTranslation = parseTranslation(match[0]);
      if (!parsedTranslation) continue;

      const { key: translationKey, fullExpression } = parsedTranslation;
      const start = match.index;
      const end = start + match[0].length;

      if (this.isTypingTranslation && pos > start && pos < end) {
        continue;
      }

      if (translationKey) {
        const validation = this.validateTranslationKeyLocal(translationKey);

        decorations.push(
          Decoration.replace({
            widget: new TranslationPillWidget(
              translationKey,
              fullExpression,
              start,
              end,
              this.onSelect,
              validation.hasError,
              validation.errorMessage
            ),
            inclusive: false,
            side: -1,
          }).range(start, end)
        );
      }
    }

    this.lastCompletionRef.current = null;
    return Decoration.set(decorations, true);
  }
}
