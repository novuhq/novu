import { Decoration, DecorationSet, EditorView, Range } from '@uiw/react-codemirror';
import { MutableRefObject } from 'react';
import { VARIABLE_REGEX_STRING } from './';
import { isTypingVariable, parseVariable } from './utils';
import { VariablePillWidget } from './variable-pill-widget';

export class VariablePluginView {
  decorations: DecorationSet;

  lastCursor: number = 0;

  isTypingVariable: boolean = false;

  constructor(
    view: EditorView,
    private viewRef: MutableRefObject<EditorView | null>,
    private lastCompletionRef: MutableRefObject<{ from: number; to: number } | null>,
    private onSelect?: (value: string, from: number, to: number) => void
  ) {
    this.decorations = this.createDecorations(view);
    viewRef.current = view;
  }

  update(update: any) {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      const pos = update.state.selection.main.head;
      const content = update.state.doc.toString();

      this.isTypingVariable = isTypingVariable(content, pos);
      this.decorations = this.createDecorations(update.view);
    }

    if (update.view) {
      this.viewRef.current = update.view;
    }
  }

  createDecorations(view: EditorView) {
    const decorations: Range<Decoration>[] = [];
    const content = view.state.doc.toString();
    const pos = view.state.selection.main.head;
    let match: RegExpExecArray | null = null;

    const regex = new RegExp(VARIABLE_REGEX_STRING, 'g');

    // Iterate through all variable matches in the content and add the pills
    while ((match = regex.exec(content)) !== null) {
      const { fullLiquidExpression, name, start, end, filters } = parseVariable(match);

      // Skip creating pills for variables that are currently being edited
      // This allows users to modify variables without the pill getting in the way
      if (this.isTypingVariable && pos > start && pos < end) {
        continue;
      }

      if (name) {
        decorations.push(
          Decoration.replace({
            widget: new VariablePillWidget(name, fullLiquidExpression, start, end, filters?.length > 0, this.onSelect),
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
