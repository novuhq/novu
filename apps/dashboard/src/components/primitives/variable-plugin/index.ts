import { Decoration, EditorView, ViewPlugin } from '@uiw/react-codemirror';
import { VariablePluginView } from './plugin-view';
import type { PluginState } from './types';

export function createVariableExtension({
  viewRef,
  lastCompletionRef,
  onSelect,
  isAllowedVariable,
  isDigestEventsVariable,
  getVariableErrorMessage,
}: PluginState) {
  return ViewPlugin.fromClass(
    class {
      private view: VariablePluginView;

      constructor(view: EditorView) {
        this.view = new VariablePluginView(
          view,
          viewRef,
          lastCompletionRef,
          isAllowedVariable,
          onSelect,
          isDigestEventsVariable,
          getVariableErrorMessage
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

export const VARIABLE_PILL_CLASS = 'cm-variable-pill';
export const FILTERS_CLASS = 'has-filters';

export * from './types';
