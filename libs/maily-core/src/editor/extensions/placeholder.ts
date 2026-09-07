import Placeholder from '@tiptap/extension-placeholder';

export const PlaceholderExtension = Placeholder.configure({
  placeholder: ({ node }) => {
    if (node.type.name === 'heading') {
      return `Heading ${node.attrs.level}`;
    } else if (node.type.name === 'htmlCodeBlock') {
      return 'Type your HTML code...';
    } else if (['columns', 'column', 'section', 'repeat', 'show', 'blockquote'].includes(node.type.name)) {
      return '';
    }

    return 'Write something or / to see commands';
  },
  includeChildren: true,
});
