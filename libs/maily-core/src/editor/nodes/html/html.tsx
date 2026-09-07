/* cspell:ignore Lowlight lowlight */
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { TextSelection } from '@tiptap/pm/state';
import { NodeViewContent, NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import html from 'highlight.js/lib/languages/xml';
import { common, createLowlight } from 'lowlight';
import { updateAttributes } from '@/editor/utils/update-attribute';
import { DEFAULT_SECTION_SHOW_IF_KEY } from '@/extensions';
import { HTMLCodeBlockView } from './html-view';

const lowlight = createLowlight(common);
lowlight.register('html', html);

export type HtmlCodeBlockAttributes = {
  activeTab: string;
  showIfKey: string;
  language: string;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    htmlCodeBlock: {
      /**
       * Set a code block
       * @param attributes Code block attributes
       * @example editor.commands.setCodeBlock({ language: 'javascript' })
       */
      setHtmlCodeBlock: (attributes?: { language: string }) => ReturnType;
      /**
       * Toggle a code block
       * @param attributes Code block attributes
       * @example editor.commands.toggleCodeBlock({ language: 'javascript' })
       */
      toggleHtmlCodeBlock: (attributes?: { language: string }) => ReturnType;
      updateHtmlCodeBlock: (attrs: Partial<HtmlCodeBlockAttributes>) => ReturnType;
    };
  }
}

export const HTMLCodeBlockExtension = CodeBlockLowlight.extend({
  name: 'htmlCodeBlock',
  content: '(text|variable)*',

  addAttributes() {
    return {
      ...this.parent?.(),
      activeTab: 'code',
      showIfKey: {
        default: DEFAULT_SECTION_SHOW_IF_KEY,
        parseHTML: (element) => {
          return element.getAttribute('data-show-if-key') || DEFAULT_SECTION_SHOW_IF_KEY;
        },
        renderHTML(attributes) {
          if (!attributes.showIfKey) {
            return {};
          }

          return {
            'data-show-if-key': attributes.showIfKey,
          };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(HTMLCodeBlockView, {
      className: 'mly-relative',
      attrs: ({ node }) => ({
        'data-active-tab': node?.attrs?.activeTab || 'code',
      }),
    });
  },

  addCommands() {
    return {
      setHtmlCodeBlock:
        (attributes) =>
        ({ commands }) => {
          return commands.setNode(this.name, attributes);
        },
      toggleHtmlCodeBlock:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleNode(this.name, 'paragraph', attributes);
        },
      updateHtmlCodeBlock: (attrs) => updateAttributes(this.name, attrs),
    };
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      'Mod-a': ({ editor }) => {
        const { selection } = editor.state;
        const $pos = selection.$anchor;

        // resolve the position to the code block node
        // and check if the node is a code block
        const node = $pos.node($pos.depth);
        if (node.type.name !== this.name) {
          return false;
        }

        // find the depth of the code block node
        // to get the correct start and end position
        // usually when we are inside a code block
        // the depth is the same as the code block node
        let depth = $pos.depth;
        for (let d = depth; d > 0; d--) {
          if ($pos.node(d).type.name === this.name) {
            depth = d;
            break;
          }
        }

        // find the start and end position of the code block
        // and set the selection to the code block
        const start = $pos.before(depth) + 1; // +1 to move inside the code block
        const end = $pos.after(depth) - 1; // -1 to stay inside the code block

        const from = editor.state.doc.resolve(start);
        const to = editor.state.doc.resolve(end);
        if (from && to) {
          const transaction = editor.state.tr.setSelection(TextSelection.between(from, to));
          editor.view.dispatch(transaction);
          return true;
        }

        return false;
      },
    };
  },
}).configure({
  lowlight,
});
