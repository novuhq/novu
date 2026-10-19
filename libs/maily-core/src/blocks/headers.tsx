import { LogoWithCoverImageIcon } from '@/editor/components/icons/logo-with-cover-image';
import { LogoWithTextHorizonIcon } from '@/editor/components/icons/logo-with-text-horizon';
import { LogoWithTextVerticalIcon } from '@/editor/components/icons/logo-with-text-vertical';
import { BlockItem } from './types';

export const headerLogoWithTextHorizontal: BlockItem = {
  title: 'Logo with Text (Horizontal)',
  description: 'Logo and a text horizontally',
  searchTerms: ['logo', 'text'],
  icon: <LogoWithTextHorizonIcon className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => {
    editor
      .chain()
      .deleteRange(range)
      .insertContent({
        type: 'columns',
        attrs: { showIfKey: null, gap: 8 },
        content: [
          {
            type: 'column',
            attrs: {
              columnId: '36de3eda-0677-47c3-a8b7-e071dec9ce30',
              width: 'auto',
              verticalAlign: 'middle',
            },
            content: [
              {
                type: 'image',
                attrs: {
                  src: 'https://maily.to/brand/logo.png',
                  alt: null,
                  title: null,
                  width: '32',
                  height: '32',
                  alignment: 'left',
                  externalLink: null,
                  isExternalLinkVariable: false,
                  isSrcVariable: false,
                  showIfKey: null,
                },
              },
            ],
          },
          {
            type: 'column',
            attrs: {
              columnId: '6feb593e-374a-4479-a1c7-872c60c2f4e0',
              width: 'auto',
              verticalAlign: 'bottom',
            },
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'right',
                  level: 3,
                  showIfKey: null,
                },
                content: [
                  {
                    type: 'text',
                    marks: [{ type: 'bold' }],
                    text: 'Weekly Newsletter',
                  },
                ],
              },
            ],
          },
        ],
      })
      .run();
  },
};

export const headerLogoWithTextVertical: BlockItem = {
  title: 'Logo with Text (Vertical)',
  description: 'Logo and a text vertically',
  searchTerms: ['logo', 'text'],
  icon: <LogoWithTextVerticalIcon className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => {
    editor
      .chain()
      .deleteRange(range)
      .insertContent([
        {
          type: 'image',
          attrs: {
            src: 'https://maily.to/brand/logo.png',
            alt: null,
            title: null,
            width: '48',
            height: '48',
            alignment: 'center',
            externalLink: null,
            isExternalLinkVariable: false,
            isSrcVariable: false,
            showIfKey: null,
          },
        },
        { type: 'spacer', attrs: { height: 8, showIfKey: null } },
        {
          type: 'heading',
          attrs: { textAlign: 'center', level: 2, showIfKey: null },
          content: [{ type: 'text', text: 'Maily' }],
        },
      ])
      .run();
  },
};

export const headerLogoWithCoverImage: BlockItem = {
  title: 'Logo with Cover Image',
  description: 'Logo and a cover image',
  searchTerms: ['logo', 'cover', 'image'],
  icon: <LogoWithCoverImageIcon className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => {
    const todayFormatted = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    editor
      .chain()
      .deleteRange(range)
      .insertContent([
        {
          type: 'image',
          attrs: {
            src: 'https://maily.to/og-image.png',
            alt: null,
            title: null,
            width: 600,
            height: 314,
            alignment: 'center',
            externalLink: null,
            isExternalLinkVariable: false,
            isSrcVariable: false,
            showIfKey: null,
          },
        },
        {
          type: 'columns',
          attrs: { showIfKey: null, gap: 8 },
          content: [
            {
              type: 'column',
              attrs: {
                columnId: '36de3eda-0677-47c3-a8b7-e071dec9ce30',
                width: 'auto',
                verticalAlign: 'middle',
              },
              content: [
                {
                  type: 'image',
                  attrs: {
                    src: 'https://maily.to/brand/logo.png',
                    alt: null,
                    title: null,
                    width: '48',
                    height: '48',
                    alignment: 'left',
                    externalLink: null,
                    isExternalLinkVariable: false,
                    isSrcVariable: false,
                    showIfKey: null,
                  },
                },
              ],
            },
            {
              type: 'column',
              attrs: {
                columnId: '6feb593e-374a-4479-a1c7-872c60c2f4e0',
                width: 'auto',
                verticalAlign: 'middle',
              },
              content: [
                {
                  type: 'paragraph',
                  attrs: { textAlign: 'right', showIfKey: null },
                  content: [
                    {
                      type: 'text',
                      marks: [{ type: 'bold' }],
                      text: 'Weekly Newsletter',
                    },
                    { type: 'hardBreak' },
                    {
                      type: 'text',
                      marks: [{ type: 'textStyle', attrs: { color: '#929292' } }],
                      text: todayFormatted,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
      .run();
  },
};
