/* cspell:ignore Dropcursor dropcursor */
import { AnyExtension, Extension } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Dropcursor from '@tiptap/extension-dropcursor';
import Focus from '@tiptap/extension-focus';
import Heading from '@tiptap/extension-heading';
import { LinkOptions } from '@tiptap/extension-link';
import ListItem from '@tiptap/extension-list-item';
import Paragraph from '@tiptap/extension-paragraph';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import { ButtonExtension } from '../nodes/button/button';
import { ColumnExtension } from '../nodes/columns/column';
import { ColumnsExtension } from '../nodes/columns/columns';
import { Footer } from '../nodes/footer';
import { HeadingExtension } from '../nodes/heading/heading';
import { ImageExtension } from '../nodes/image/image';
import { LinkExtension } from '../nodes/link';
import { LogoExtension } from '../nodes/logo/logo';
import { ParagraphExtension } from '../nodes/paragraph/paragraph';
import { RepeatExtension } from '../nodes/repeat/repeat';
import { SectionExtension } from '../nodes/section/section';
import { Spacer } from '../nodes/spacer';
import { Color } from './color';
import { HorizontalRule } from './horizontal-rule';
import { LinkCardExtension, LinkCardOptions } from './link-card';

export type MailyKitOptions = {
  linkCard?: Partial<LinkCardOptions> | false;
  repeat?: Partial<{}> | false;
  section?: Partial<{}> | false;
  columns?: Partial<{}> | false;
  column?: Partial<{}> | false;
  button?: Partial<{}> | false;
  spacer?: Partial<{}> | false;
  logo?: Partial<{}> | false;
  image?: Partial<{}> | false;
  link?: Partial<LinkOptions> | false;
};

export const MailyKit = Extension.create<MailyKitOptions>({
  name: 'maily-kit',

  addOptions() {
    return {
      link: {
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
          class: 'mly-no-underline',
        },
        openOnClick: false,
      },
    };
  },

  addExtensions() {
    const extensions: AnyExtension[] = [
      Document.extend({
        content: '(block|columns)+',
      }),
      StarterKit.configure({
        code: {
          HTMLAttributes: {
            class:
              'mly-px-1 mly-relative mly-py-0.5 mly-bg-[#efefef] mly-text-sm mly-rounded-md mly-tracking-normal mly-font-normal',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'mly-relative',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'mly-relative',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'mly-relative',
          },
        },
        heading: false,
        paragraph: false,
        horizontalRule: false,
        dropcursor: false,
        document: false,
      }) as AnyExtension,
      Underline,
      Color.configure({ types: [TextStyle.name, ListItem.name] }),
      TextStyle.configure(),
      TextAlign.configure({
        types: [Paragraph.name, Heading.name, Footer.name],
      }),
      HorizontalRule,
      Footer,
      Focus,
      Dropcursor.configure({
        color: '#C1DDFB',
        width: 2,
        class: 'ProseMirror-dropcursor',
      }),
      HeadingExtension.configure({
        levels: [1, 2, 3],
        HTMLAttributes: {
          class: 'mly-relative',
        },
      }),
      ParagraphExtension.configure({
        HTMLAttributes: {
          class: 'mly-relative',
        },
      }),
    ];

    if (this.options.linkCard !== false) {
      extensions.push(LinkCardExtension.configure(this.options.linkCard));
    }

    if (this.options.repeat !== false) {
      extensions.push(RepeatExtension);
    }

    if (this.options.section !== false) {
      extensions.push(SectionExtension);
    }

    if (this.options.columns !== false) {
      extensions.push(ColumnsExtension);
    }

    if (this.options.column !== false) {
      extensions.push(ColumnExtension);
    }

    if (this.options.button !== false) {
      extensions.push(ButtonExtension);
    }

    if (this.options.spacer !== false) {
      extensions.push(Spacer);
    }

    if (this.options.logo !== false) {
      extensions.push(LogoExtension);
    }

    if (this.options.image !== false) {
      extensions.push(ImageExtension);
    }

    if (this.options.link !== false) {
      extensions.push(LinkExtension.configure(this.options.link));
    }

    return extensions;
  },
});
