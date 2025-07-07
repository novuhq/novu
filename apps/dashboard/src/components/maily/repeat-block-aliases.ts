import type { Editor, Editor as TiptapEditor } from '@tiptap/core';
import { parseVariable } from '@/utils/liquid';

export const REPEAT_BLOCK_ITERABLE_ALIAS = 'current';
export const ALLOWED_ALIASES = [REPEAT_BLOCK_ITERABLE_ALIAS];

export function isAllowedAlias(variableName: string): boolean {
  const [variablePart] = variableName.split('|');
  const nameRoot = variablePart.split('.')[0];

  return ALLOWED_ALIASES.includes(nameRoot);
}

export const resolveRepeatBlockAlias = (variable: string, editor: Editor): string | null => {
  // Extract the root of the variable name (before any dots)
  const parsedVariable = parseVariable(variable);
  if (!parsedVariable) return null;

  const { nameRoot, name, filters } = parsedVariable;

  if (isAllowedAlias(nameRoot) && isInsideRepeatBlock(editor)) {
    // Replace only the variable name part, keeping the filters separate
    const replacedVariable = name.replace(nameRoot, editor.getAttributes('repeat')?.each);

    // Return the replaced variable with filters appended
    return replacedVariable + filters;
  }

  return null;
};

export const isInsideRepeatBlock = (editor: TiptapEditor): boolean => {
  return editor?.isActive('repeat') ?? false;
};

const findRepeatBlock = (editor: Editor) => {
  const { $from } = editor.state.selection;

  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'repeat') {
      return { block: $from.node(depth), depth };
    }
  }

  return null;
};

const getVariableFromNodeAttrs = (nodeType: string, attrs: Record<string, any>): string | null => {
  switch (nodeType) {
    case 'variable':
      return attrs.id;
    case 'button':
      if (attrs.isTextVariable && attrs.text) return attrs.text;
      if (attrs.isUrlVariable && attrs.url) return attrs.url;
      return null;
    case 'image':
    case 'inlineImage':
      if (attrs.isSrcVariable && attrs.src) return attrs.src;
      if (attrs.isExternalLinkVariable && attrs.externalLink) return attrs.externalLink;
      return null;
    case 'link':
      if (attrs.isUrlVariable && attrs.href) return attrs.href;
      return null;
    default:
      return null;
  }
};

/**
 * Updates the 'aliasFor' attribute for all child nodes of the selected repeat block,
 * when the repeat block iterable changes.
 *
 * @example
 * iterable: 'payload.comments' => 'payload.blogs'
 * variable aliasFor: 'payload.comments.author' => 'payload.blogs.author'
 */
export const updateRepeatBlockChildAliases = (editor: Editor) => {
  const repeat = findRepeatBlock(editor);

  if (!repeat) return;

  editor
    .chain()
    .command(({ tr }) => {
      const { block, depth } = repeat;
      const repeatPos = editor.state.selection.$from.before(depth);

      block.content.descendants((node, pos) => {
        if (!node.attrs.aliasFor) return;

        const variableValue = getVariableFromNodeAttrs(node.type.name, node.attrs);
        if (!variableValue) return;

        const newAlias = resolveRepeatBlockAlias(variableValue, editor);
        tr.setNodeMarkup(repeatPos + pos + 1, null, { ...node.attrs, aliasFor: newAlias });
      });
      return true;
    })
    .run();
};
