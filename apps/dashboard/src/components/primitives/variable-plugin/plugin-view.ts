import { Decoration, DecorationSet, EditorView, Range } from '@uiw/react-codemirror';
import { MutableRefObject } from 'react';
import { parseVariable, VARIABLE_REGEX_STRING } from '@/utils/liquid';
import { isVariableInLocalContext } from '@/utils/liquid-scope-analyzer';
import { IsAllowedVariable } from '@/utils/parseStepVariables';
import { isTypingVariable } from './utils';
import { VariablePillWidget } from './variable-pill-widget';

export class VariablePluginView {
  decorations: DecorationSet;

  lastCursor: number = 0;

  isTypingVariable: boolean = false;

  constructor(
    view: EditorView,
    private viewRef: MutableRefObject<EditorView | null>,
    private lastCompletionRef: MutableRefObject<{ from: number; to: number } | null>,
    private isAllowedVariable: IsAllowedVariable,
    private onSelect?: (value: string, from: number, to: number) => void,
    private isDigestEventsVariable?: (variableName: string) => boolean,
    private getVariableErrorMessage?: (variableName: string, isAllowed: boolean) => string | undefined
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
      const parsedVariable = parseVariable(match[0]);

      if (!parsedVariable) {
        continue;
      }

      const { fullLiquidExpression, name, filtersArray } = parsedVariable;
      const start = match.index;
      const end = start + match[0].length;

      // Skip creating pills for variables that are currently being edited
      // This allows users to modify variables without the pill getting in the way
      if (this.isTypingVariable && pos > start && pos < end) {
        continue;
      }

      // Check if the variable is allowed (in schema or in local context)
      const isAllowed = this.isAllowedVariable({ name }) || isVariableInLocalContext(content, name, start);

      // Get error message if variable is not allowed
      const errorMessage =
        !isAllowed && this.getVariableErrorMessage ? this.getVariableErrorMessage(name, false) : undefined;

      if (name) {
        decorations.push(
          Decoration.replace({
            widget: new VariablePillWidget(
              name,
              fullLiquidExpression,
              start,
              end,
              filtersArray,
              this.onSelect,
              this.isDigestEventsVariable,
              !isAllowed,
              errorMessage
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
