import TiptapParagraph from '@tiptap/extension-paragraph';
import { DEFAULT_SECTION_SHOW_IF_KEY } from '../section/section';

export const ParagraphExtension = TiptapParagraph.extend({
  addAttributes() {
    return {
      ...(this?.parent?.() || {}),
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
});
