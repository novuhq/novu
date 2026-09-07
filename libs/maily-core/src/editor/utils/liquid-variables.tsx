import { Editor } from '@tiptap/core';
import { Fragment, ReactNode } from 'react';
import { SuggestionProvider } from '../bubble-suggestions/suggestion-provider';
import { RenderVariableOptions } from '../nodes/variable/variable';

/** Matches each `{{ ... }}` liquid expression; capture group 1 is the (untrimmed) inner path. */
const LIQUID_SEGMENT_REGEX = /\{\{\s*([\s\S]*?)\s*\}\}/g;

/** Marker attribute on a rendered variable pill so a parent can tell a pill click from a text click. */
export const VARIABLE_PILL_MARKER_ATTR = 'data-mly-variable-pill';

/** Whether the value contains at least one `{{ ... }}` liquid expression. */
export function hasLiquidExpression(value: string): boolean {
  return new RegExp(LIQUID_SEGMENT_REGEX).test(value);
}

/**
 * Controls whether the card Actions bubble stays mounted while a Configure Variable popover is open.
 * Set true just before opening the popover from a Label/URL field pill (so it renders on top of the
 * bubble); false for a button-content pill on canvas (so the bubble hides, like the email button).
 */
export function setKeepCardActionsMenuOpen(editor: Editor, value: boolean): void {
  if (editor.storage?.variable) {
    editor.storage.variable.keepCardActionsMenu = value;
  }
}

/**
 * Closes the Configure Variable popover from outside its React tree (e.g. switching to the Actions
 * bubble). Host UIs that own the controlled `open` state should sync closed when
 * `editor.storage.variable.popover` becomes false (see dashboard `VariableFromButton`).
 */
export function closeVariablePopover(editor: Editor): void {
  if (editor.storage?.variable) {
    editor.storage.variable.popover = false;
    editor.storage.variable.keepCardActionsMenu = false;
  }

  // Always dispatch: Radix may have already cleared `popover` on outside-click before this runs,
  // but BubbleMenus still need a transaction (or a selection bounce) to re-evaluate `shouldShow`.
  editor.view.dispatch(editor.state.tr.setMeta('variablePopover', false));
}

/**
 * Renders a string that mixes plain text and `{{ path }}` liquid expressions: each expression is
 * drawn as a variable pill (via the variable provider's `renderValue`) and the surrounding text is
 * rendered verbatim. Returns the raw string when there is no provider or no `{{ }}` expression.
 */
export function renderLiquidVariableSegments({
  value,
  provider,
  editor,
  from,
  markVariablePills = false,
}: {
  value: string;
  provider: SuggestionProvider | null | undefined;
  editor: Editor;
  from: RenderVariableOptions['from'];
  /** When true, wrap each pill in a `[data-mly-variable-pill]` span for pill-vs-text click detection. */
  markVariablePills?: boolean;
}): ReactNode {
  if (!provider) {
    return value;
  }

  const matches = [...value.matchAll(new RegExp(LIQUID_SEGMENT_REGEX))];

  if (matches.length === 0) {
    return value;
  }

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  const pushText = (text: string) => {
    if (!text) {
      return;
    }

    // Keep typed spaces visible — flex parents otherwise collapse anonymous whitespace nodes.
    nodes.push(
      <span key={key++} className="mly-whitespace-pre">
        {text}
      </span>
    );
  };

  for (const match of matches) {
    const start = match.index ?? 0;

    if (start > lastIndex) {
      pushText(value.slice(lastIndex, start));
    }

    const pill = provider.renderValue(match[1].trim(), editor, from);
    nodes.push(
      markVariablePills ? (
        <span
          key={key++}
          {...{ [VARIABLE_PILL_MARKER_ATTR]: 'true' }}
          className="mly-inline-flex mly-shrink-0 mly-items-center"
        >
          {pill}
        </span>
      ) : (
        <span key={key++} className="mly-inline-flex mly-shrink-0 mly-items-center">
          {pill}
        </span>
      )
    );
    lastIndex = start + match[0].length;
  }

  if (lastIndex < value.length) {
    pushText(value.slice(lastIndex));
  }

  return nodes;
}
