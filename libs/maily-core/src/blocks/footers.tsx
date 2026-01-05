import { CopyrightIcon, LayoutTemplateIcon, RectangleHorizontalIcon } from 'lucide-react';
import { BlockItem } from './types';

export const footerCopyrightText: BlockItem = {
  title: 'Footer Copyright',
  description: 'Copyright text for the footer.',
  searchTerms: ['footer', 'copyright'],
  icon: <CopyrightIcon className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => {
    const currentYear = new Date().getFullYear();

    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({
        type: 'paragraph',
        attrs: { textAlign: 'center', showIfKey: null },
        content: [
          {
            type: 'text',
            marks: [{ type: 'textStyle', attrs: { color: '#AAAAAA' } }],
            text: `Maily © ${currentYear}. All rights reserved.`,
          },
        ],
      })
      .run();
  },
};

export const footerCommunityFeedbackCta: BlockItem = {
  title: 'Footer Community Feedback CTA',
  description: 'Community feedback CTA for the footer.',
  searchTerms: ['footer', 'community', 'feedback', 'cta'],
  icon: <RectangleHorizontalIcon className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent([
        {
          type: 'image',
          attrs: {
            src: 'https://maily.to/brand/logo.png',
            alt: null,
            title: null,
            width: '42',
            height: '42',
            alignment: 'left',
            externalLink: null,
            isExternalLinkVariable: false,
            isSrcVariable: false,
            showIfKey: null,
          },
        },
        { type: 'spacer', attrs: { height: 16, showIfKey: null } },
        {
          type: 'footer',
          attrs: { textAlign: null, 'maily-component': 'footer' },
          content: [
            {
              type: 'text',
              marks: [{ type: 'textStyle', attrs: { color: '' } }],
              text: 'Enjoyed this month’s update?',
            },
            { type: 'hardBreak' },
            {
              type: 'text',
              marks: [{ type: 'textStyle', attrs: { color: '' } }],
              text: "And, as always, we'd love your feedback – simply reply to the email or reach out via the Discord community!",
            },
          ],
        },
      ])
      .run();
  },
};

export const footerCompanySignature: BlockItem = {
  title: 'Footer Company Signature',
  description: 'Company signature for the footer.',
  searchTerms: ['footer', 'company', 'signature'],
  icon: <LayoutTemplateIcon className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent([
        { type: 'horizontalRule' },
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
        { type: 'spacer', attrs: { height: 16, showIfKey: null } },
        {
          type: 'heading',
          attrs: { textAlign: 'center', level: 3, showIfKey: null },
          content: [{ type: 'text', text: 'Maily' }],
        },
        { type: 'spacer', attrs: { height: 4, showIfKey: null } },
        {
          type: 'footer',
          attrs: { textAlign: 'center', 'maily-component': 'footer' },
          content: [
            {
              type: 'text',
              marks: [{ type: 'textStyle', attrs: { color: '' } }],
              text: '1234 Example Street, Example, DE 19801, United States',
            },
            { type: 'hardBreak' },
            {
              type: 'text',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: 'https://maily.to',
                    target: '_blank',
                    rel: 'noopener noreferrer nofollow',
                    class: 'mly-no-underline',
                    isUrlVariable: false,
                  },
                },
                { type: 'textStyle', attrs: { color: '#64748b' } },
                { type: 'underline' },
              ],
              text: 'VISIT COMPANY',
            },
            {
              type: 'text',
              marks: [{ type: 'textStyle', attrs: { color: '#64748b' } }],
              text: '  |  ',
            },
            {
              type: 'text',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: 'https://maily.to',
                    target: '_blank',
                    rel: 'noopener noreferrer nofollow',
                    class: 'mly-no-underline',
                    isUrlVariable: false,
                  },
                },
                { type: 'textStyle', attrs: { color: '#64748b' } },
                { type: 'underline' },
              ],
              text: 'VISIT OUR BLOG',
            },
            {
              type: 'text',
              marks: [{ type: 'textStyle', attrs: { color: '#64748b' } }],
              text: '  |  ',
            },
            {
              type: 'text',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: 'https://maily.to',
                    target: '_blank',
                    rel: 'noopener noreferrer nofollow',
                    class: 'mly-no-underline',
                    isUrlVariable: false,
                  },
                },
                { type: 'textStyle', attrs: { color: '#64748b' } },
                { type: 'underline' },
              ],
              text: 'UNSUBSCRIBE',
            },
          ],
        },
        {
          type: 'paragraph',
          attrs: { textAlign: 'center', showIfKey: null },
          content: [
            {
              type: 'inlineImage',
              attrs: {
                height: 20,
                width: 20,
                src: 'https://cdn.usemaily.com/images/icons/linkedin.png',
                isSrcVariable: false,
                alt: null,
                title: null,
                externalLink: 'https://www.linkedin.com/in/arikchakma/',
                isExternalLinkVariable: false,
              },
            },
            { type: 'text', text: '  ' },
            {
              type: 'inlineImage',
              attrs: {
                height: 20,
                width: 20,
                src: 'https://cdn.usemaily.com/images/icons/youtube.png',
                isSrcVariable: false,
                alt: null,
                title: null,
                externalLink: 'https://www.youtube.com/arikchakma',
                isExternalLinkVariable: false,
              },
            },
            { type: 'text', text: '  ' },
            {
              type: 'inlineImage',
              attrs: {
                height: 20,
                width: 20,
                src: 'https://cdn.usemaily.com/images/icons/twitter.png',
                isSrcVariable: false,
                alt: null,
                title: null,
                externalLink: 'https://x.com/imarikchakma',
                isExternalLinkVariable: false,
              },
            },
          ],
        },
      ])
      .run();
  },
};
