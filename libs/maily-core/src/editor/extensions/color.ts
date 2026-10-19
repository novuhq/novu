import TiptapColor, { ColorOptions } from '@tiptap/extension-color';

type ColorStorage = {
  /**
   * Last 5 used colors
   */
  colors: Set<string>;
};

export const Color = TiptapColor.extend<ColorOptions, ColorStorage>({
  addStorage() {
    return {
      colors: new Set(),
    };
  },
});
