import { Editor } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { HorizontalRule } from '../extensions/horizontal-rule';
import { LinkCardExtension } from '../extensions/link-card';
import { ButtonExtension } from '../nodes/button/button';
import { HTMLCodeBlockExtension } from '../nodes/html/html';
import { ImageExtension } from '../nodes/image/image';
import { InlineImageExtension } from '../nodes/inline-image/inline-image';
import { LogoExtension } from '../nodes/logo/logo';
import { Spacer } from '../nodes/spacer';
import { VariableExtension } from '../nodes/variable/variable';

export const isCustomNodeSelected = (editor: Editor, node: HTMLElement) => {
  const customNodes = [
    HorizontalRule.name,
    Image.name,
    Spacer.name,
    ImageExtension.name,
    VariableExtension.name,
    LinkCardExtension.name,
    LogoExtension.name,
    ButtonExtension.name,
    HTMLCodeBlockExtension.name,
    InlineImageExtension.name,
  ];

  return customNodes.some((type) => editor.isActive(type));
};
