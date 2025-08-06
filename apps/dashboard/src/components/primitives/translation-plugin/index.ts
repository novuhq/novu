import { Decoration, EditorView, ViewPlugin } from '@uiw/react-codemirror';
import { MutableRefObject } from 'react';
import { TranslationKey } from '@/types/translations';
import { TranslationPluginView } from './plugin-view';

interface TranslationPluginState {
  viewRef: MutableRefObject<EditorView | null>;
  lastCompletionRef: MutableRefObject<{ from: number; to: number } | null>;
  onSelect?: (translationKey: string, from: number, to: number) => void;
  translationKeys?: TranslationKey[];
  isTranslationKeysLoading?: boolean;
}

export function createTranslationExtension({
  viewRef,
  lastCompletionRef,
  onSelect,
  translationKeys,
  isTranslationKeysLoading,
}: TranslationPluginState) {
  return ViewPlugin.fromClass(
    class {
      private view: TranslationPluginView;

      constructor(view: EditorView) {
        this.view = new TranslationPluginView(
          view,
          viewRef,
          lastCompletionRef,
          onSelect,
          translationKeys,
          isTranslationKeysLoading
        );
      }

      update(update: any) {
        this.view.update(update);
      }

      get decorations() {
        return this.view.decorations;
      }
    },
    {
      decorations: (v) => v.decorations,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => {
          return view.plugin(plugin)?.decorations || Decoration.none;
        }),
    }
  );
}
