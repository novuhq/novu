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

  const defaultExtensions = [
    MailyKit,
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
