import { Editor, mergeAttributes, Node } from '@tiptap/core';
import { Node as TNode } from '@tiptap/pm/model';
import { PluginKey } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import type { JSX } from 'react';
import { registerSuggestionProvider } from '../../bubble-suggestions';
import { createVariableProvider } from '../../bubble-suggestions/providers/variable-provider';
import { VariableSuggestionsPopover, VariableSuggestionsPopoverType } from './variable-suggestions-popover';
import { DefaultRenderVariable, VariableView } from './variable-view';

// Register the provider at module level so it's available immediately
registerSuggestionProvider('variable', createVariableProvider);

export type Variable = {
  name: string;
  // Default is true
  required?: boolean;
  // default is true
  valid?: boolean;
};

export type VariableFunctionOptions = {
  query: string;
  from: 'content-variable' | 'bubble-variable' | 'repeat-variable';
  editor: Editor;
};

export type VariablesFunction = (opts: VariableFunctionOptions) => Array<Variable>;

export type Variables = Array<Variable> | VariablesFunction;

export const DEFAULT_VARIABLE_TRIGGER_CHAR = '@';
export const DEFAULT_VARIABLES: Variables = [];
export const DEFAULT_RENDER_VARIABLE_FUNCTION: RenderVariableFunction = DefaultRenderVariable;
export const DEFAULT_VARIABLE_SUGGESTION_POPOVER = VariableSuggestionsPopover;

export type RenderVariableOptions = {
  variable: Variable;
  fallback?: string;
  editor: Editor;
  from: 'content-variable' | 'bubble-variable' | 'button-variable';
};

export type RenderVariableFunction = (opts: RenderVariableOptions) => JSX.Element | null;

export type VariableOptions = {
  renderLabel: (props: { options: VariableOptions; node: TNode }) => string;
  suggestion: Omit<SuggestionOptions, 'editor'>;

  /**
   * Variables is the array of variables that will be used to render the variable pill.
   */
  variables: Variables;

  /**
   * Render variable is the function that will be used to render the variable pill.
   * @default DefaultRenderVariable
   */
  renderVariable: RenderVariableFunction;

  /**
   * Variable suggestion popover is the component that will be used to render
   * the variable suggestions for the content, bubble menu variables
   * @default VariableSuggestionPopover
   */
  variableSuggestionsPopover: VariableSuggestionsPopoverType;
};

export type VariableStorage = {
  popover: boolean;
};

export const VariablePluginKey = new PluginKey('variable');

export const VariableExtension = Node.create<VariableOptions, VariableStorage>({
  name: 'variable',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addStorage() {
    return {
      popover: false,
    };
  },

  addOptions() {
    return {
      variables: DEFAULT_VARIABLES,
      variableSuggestionsPopover: DEFAULT_VARIABLE_SUGGESTION_POPOVER,
      renderVariable: DEFAULT_RENDER_VARIABLE_FUNCTION,

      renderLabel(props) {
        const { node } = props;
        return `${node.attrs.label ?? node.attrs.id}`;
      },

      suggestion: {
        char: '@',
        pluginKey: VariablePluginKey,
        command: ({ editor, range, props }) => {
          // increase range.to by one when the next node is of type "text"
          // and starts with a space character
          const nodeAfter = editor.view.state.selection.$to.nodeAfter;
          const overrideSpace = nodeAfter?.text?.startsWith(' ');

          if (overrideSpace) {
            range.to += 1;
          }

          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: props,
              },
              {
                type: 'text',
                text: ' ',
              },
            ])
            .run();

          window.getSelection()?.collapseToEnd();
        },
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const type = state.schema.nodes[this.name];
          const allow = !!$from.parent.type.contentMatch.matchType(type);

          return allow;
        },
      },
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-id'),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }

          return {
            'data-id': attributes.id,
          };
        },
      },

      label: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-label'),
        renderHTML: (attributes) => {
          if (!attributes.label) {
            return {};
          }

          return {
            'data-label': attributes.label,
          };
        },
      },

      fallback: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-fallback'),
        renderHTML: (attributes) => {
          if (!attributes.fallback) {
            return {};
          }

          return {
            'data-fallback': attributes.fallback,
          };
        },
      },

      required: {
        default: true,
        parseHTML: (element) => element.hasAttribute('data-required'),
        renderHTML: (attributes) => {
          return {
            'data-required': attributes?.required ?? true,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-type': this.name }, HTMLAttributes),
      this.options.renderLabel({
        options: this.options,
        node,
      }),
    ];
  },

  renderText({ node }) {
    return this.options.renderLabel({
      options: this.options,
      node,
    });
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isMention = false;
          const { selection } = state;
          const { empty, anchor } = selection;

          if (!empty) {
            return false;
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            if (node.type.name === this.name) {
              isMention = true;
              tr.insertText(this.options.suggestion.char || '', pos, pos + node.nodeSize);

              return false;
            }
          });

          return isMention;
        }),
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableView, {
      className: 'mly-relative mly-inline-block',
      as: 'div',
    });
  },
});
