import { AnyExtension } from '@tiptap/core';
import { VariableExtension } from '@/extensions';
import { HTMLCodeBlockExtension } from '../nodes/html/html';
import { InlineImageExtension } from '../nodes/inline-image/inline-image';
import { getVariableSuggestions } from '../nodes/variable/variable-suggestions';
import { MailyContextType } from '../provider';
import { MailyKit } from './maily-kit';
import { PlaceholderExtension } from './placeholder';
import { SlashCommandExtension } from './slash-command/slash-command';
import { getSlashCommandSuggestions } from './slash-command/slash-command-view';

type ExtensionsProps = Partial<MailyContextType> & {
  extensions?: AnyExtension[];
};

export function extensions(props: ExtensionsProps) {
  const { blocks, extensions = [] } = props;

  // Dashboard re-registers `image` with `.extend().configure(...)`. Disable the kit
  // copy so attribute defaults (e.g. chat `defaultAlignment: 'left'`) actually apply.
  const hasCustomImage = extensions.some((extension) => extension.name === 'image');

  const defaultExtensions = [
    MailyKit.configure({
      ...(hasCustomImage ? { image: false as const } : {}),
    }),
    SlashCommandExtension.configure({
      suggestion: getSlashCommandSuggestions(blocks),
    }),
    VariableExtension.configure({
      suggestion: getVariableSuggestions(),
    }),
    HTMLCodeBlockExtension,
    InlineImageExtension,
    PlaceholderExtension,
  ].filter((ext) => {
    return !extensions.some((e) => e.name === ext.name);
  });

  return [...defaultExtensions, ...extensions];
}
