import TiptapLink from '@tiptap/extension-link';

export type LinkAttributes = {
  href: string;
  target?: string | null;
  rel?: string | null;
  class?: string | null;
  isUrlVariable?: boolean;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customLink: {
      updateLinkAttributes: (attributes: LinkAttributes) => ReturnType;
    };
  }
}

export const LinkExtension = TiptapLink.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      isUrlVariable: {
        default: false,
      },
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),

      updateLinkAttributes:
        (attributes) =>
        ({ chain }) => {
          const { isUrlVariable, href, ...attrs } = attributes;
          if (!href) {
            return chain().focus().extendMarkRange('link').unsetLink().unsetUnderline().run();
          }

          return chain()
            .extendMarkRange('link')
            .setLink({ href, ...attrs })
            .setMark('link', { isUrlVariable: isUrlVariable ?? false })
            .setUnderline()
            .run();
        },
    };
  },
});
