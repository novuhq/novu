import { BlockItem } from '@maily-to/core/blocks';
import { EmailFooter } from '@/components/icons/email-footer';
import { EmailFooterLogoWithTextStacked } from '@/components/icons/email-footer-logo-with-text-stacked';
import { EmailFooterPlainText } from '@/components/icons/email-footer-plain-text';
import { EmailHeaderLogoWithCoverImage } from '@/components/icons/email-header-logo-with-cover-image';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';

export const createFooterPlainText: (props: { track: ReturnType<typeof useTelemetry> }) => BlockItem = (props) => {
  const { track } = props;

  return {
    title: 'Plain text footer',
    description: 'Footer: Minimal text',
    searchTerms: ['footer', 'copyright'],
    icon: <EmailFooterPlainText className="mly-h-4 mly-w-4" />,
    preview: '/images/email-editor/footer-minimal-text-preview.png',
    command: ({ editor, range }) => {
      track(TelemetryEvent.EMAIL_BLOCK_ADDED, {
        type: 'footer',
      });

      const currentYear = new Date().getFullYear();

      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'section',
          attrs: { showIfKey: null, backgroundColor: '#FFFFFF', borderWidth: 0 },
          content: [
            { type: 'horizontalRule' },
            {
              type: 'paragraph',
              attrs: { textAlign: 'center', showIfKey: null },
              content: [
                {
                  type: 'text',
                  marks: [{ type: 'textStyle', attrs: { color: '#AAAAAA' } }],
                  text: `Company © ${currentYear}`,
                },
              ],
            },
          ],
        })
        .run();
    },
  };
};

export const createFooterLogoWithTextStacked: (props: { track: ReturnType<typeof useTelemetry> }) => BlockItem = (
  props
) => {
  const { track } = props;

  return {
    title: 'Logo with text stacked',
    description: 'Footer: Text with logo',
    searchTerms: ['footer', 'community', 'feedback', 'cta'],
    preview: '/images/email-editor/footer-text-with-logo-preview.png',
    icon: <EmailFooterLogoWithTextStacked className="mly-h-4 mly-w-4" />,
    command: ({ editor, range }) => {
      track(TelemetryEvent.EMAIL_BLOCK_ADDED, {
        type: 'footer',
      });

      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'section',
          attrs: { showIfKey: null, backgroundColor: '#FFFFFF', borderWidth: 0 },
          content: [
            {
              type: 'image',
              attrs: {
                src: 'https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/logo.png',
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
                  text: "Enjoyed this month's update?",
                },
                { type: 'hardBreak' },
                {
                  type: 'text',
                  marks: [{ type: 'textStyle', attrs: { color: '' } }],
                  text: "And, as always, we'd love your feedback – simply reply to the email or reach out via the Discord community!",
                },
              ],
            },
          ],
        })
        .run();
    },
  };
};

export const createFooterLogoTextAndSocials: (props: { track: ReturnType<typeof useTelemetry> }) => BlockItem = (
  props
) => {
  const { track } = props;

  return {
    title: 'Logo, text and socials',
    description: 'Footer: Logo with social media icons',
    searchTerms: ['footer', 'company', 'signature'],
    preview: '/images/email-editor/footer-logo-with-social-media-icons-preview.png',
    icon: <EmailHeaderLogoWithCoverImage className="mly-h-4 mly-w-4" />,
    command: ({ editor, range }) => {
      track(TelemetryEvent.EMAIL_BLOCK_ADDED, {
        type: 'footer',
      });

      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'section',
          attrs: { showIfKey: null, backgroundColor: '#FFFFFF', borderWidth: 0 },
          content: [
            { type: 'horizontalRule' },
            {
              type: 'image',
              attrs: {
                src: 'https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/logo.png',
                alt: null,
                title: null,
                width: 48,
                height: 48,
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
              content: [{ type: 'text', text: 'Company' }],
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
                        href: '',
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
                        href: '',
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
                        href: '',
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
                    src: 'https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/linkedin.png',
                    isSrcVariable: false,
                    alt: null,
                    title: null,
                    externalLink: '',
                    isExternalLinkVariable: false,
                  },
                },
                { type: 'text', text: '  ' },
                {
                  type: 'inlineImage',
                  attrs: {
                    height: 20,
                    width: 20,
                    src: 'https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/youtube.png',
                    isSrcVariable: false,
                    alt: null,
                    title: null,
                    externalLink: '',
                    isExternalLinkVariable: false,
                  },
                },
                { type: 'text', text: '  ' },
                {
                  type: 'inlineImage',
                  attrs: {
                    height: 20,
                    width: 20,
                    src: 'https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/twitter.png',
                    isSrcVariable: false,
                    alt: null,
                    title: null,
                    externalLink: '',
                    isExternalLinkVariable: false,
                  },
                },
              ],
            },
          ],
        })
        .run();
    },
  };
};

export const createFooterLogoWithSimpleText: (props: { track: ReturnType<typeof useTelemetry> }) => BlockItem = (
  props
) => {
  const { track } = props;

  return {
    title: 'Logo with simple text',
    description: 'Footer: Logo with simple text   ',
    searchTerms: ['footer', 'company', 'social', 'two-column'],
    preview: '/images/email-editor/footer-logo-with-simple-text-preview.png',
    icon: <EmailFooterPlainText className="mly-h-4 mly-w-4" />,
    command: ({ editor, range }) => {
      track(TelemetryEvent.EMAIL_BLOCK_ADDED, {
        type: 'footer',
      });

      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'section',
          attrs: { showIfKey: null, backgroundColor: '#FFFFFF', borderWidth: 0 },
          content: [
            { type: 'horizontalRule' },
            {
              type: 'columns',
              attrs: { cols: 2, showIfKey: null },
              content: [
                {
                  type: 'column',
                  attrs: { width: 50, verticalAlign: 'middle', showIfKey: null },
                  content: [
                    {
                      type: 'paragraph',
                      attrs: { textAlign: 'left', showIfKey: null },
                      content: [
                        {
                          type: 'inlineImage',
                          attrs: {
                            height: 48,
                            width: 48,
                            src: 'https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/logo.png',
                            isSrcVariable: false,
                            alt: 'Company Logo',
                            title: null,
                            externalLink: '',
                            isExternalLinkVariable: false,
                          },
                        },
                        {
                          type: 'text',
                          marks: [{ type: 'textStyle', attrs: { color: '#64748b' } }],
                          text: '  Company',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'column',
                  attrs: { width: 50, showIfKey: null },
                  content: [
                    {
                      type: 'paragraph',
                      attrs: { textAlign: 'right', showIfKey: null },
                      content: [
                        {
                          type: 'text',
                          marks: [
                            {
                              type: 'link',
                              attrs: {
                                href: '',
                                target: '_blank',
                                rel: 'noopener noreferrer nofollow',
                                class: 'mly-no-underline',
                                isUrlVariable: false,
                              },
                            },
                            { type: 'textStyle', attrs: { color: '#64748b' } },
                          ],
                          text: 'Website',
                        },
                        { type: 'text', text: '  |  ' },
                        {
                          type: 'text',
                          marks: [
                            {
                              type: 'link',
                              attrs: {
                                href: '',
                                target: '_blank',
                                rel: 'noopener noreferrer nofollow',
                                class: 'mly-no-underline',
                                isUrlVariable: false,
                              },
                            },
                            { type: 'textStyle', attrs: { color: '#64748b' } },
                          ],
                          text: 'Privacy',
                        },
                        { type: 'text', text: '  |  ' },
                        {
                          type: 'text',
                          marks: [
                            {
                              type: 'link',
                              attrs: {
                                href: '',
                                target: '_blank',
                                rel: 'noopener noreferrer nofollow',
                                class: 'mly-no-underline',
                                isUrlVariable: false,
                              },
                            },
                            { type: 'textStyle', attrs: { color: '#64748b' } },
                          ],
                          text: 'Unsubscribe',
                        },
                      ],
                    },
                    { type: 'spacer', attrs: { height: 8, showIfKey: null } },
                    {
                      type: 'paragraph',
                      attrs: { textAlign: 'right', showIfKey: null },
                      content: [
                        {
                          type: 'inlineImage',
                          attrs: {
                            height: 20,
                            width: 20,
                            src: 'https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/linkedin.png',
                            isSrcVariable: false,
                            alt: 'LinkedIn',
                            title: null,
                            externalLink: '',
                            isExternalLinkVariable: false,
                          },
                        },
                        { type: 'text', text: '  ' },
                        {
                          type: 'inlineImage',
                          attrs: {
                            height: 20,
                            width: 20,
                            src: 'https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/twitter.png',
                            isSrcVariable: false,
                            alt: 'Twitter',
                            title: null,
                            externalLink: '',
                            isExternalLinkVariable: false,
                          },
                        },
                        { type: 'text', text: '  ' },
                        {
                          type: 'inlineImage',
                          attrs: {
                            height: 20,
                            width: 20,
                            src: 'https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/youtube.png',
                            isSrcVariable: false,
                            alt: 'YouTube',
                            title: null,
                            externalLink: '',
                            isExternalLinkVariable: false,
                          },
                        },
                      ],
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
};

export const createFooters = (props: { track: ReturnType<typeof useTelemetry> }) => {
  const { track } = props;

  return {
    id: 'footers',
    title: 'Footers',
    description: 'Add a pre-made footer block to your email.',
    searchTerms: ['footer', 'footers'],
    icon: <EmailFooter className="size-4" />,
    preview: '/images/email-editor/footer-logo-with-social-media-icons-preview.png',
    commands: [
      createFooterPlainText({ track }),
      createFooterLogoWithTextStacked({ track }),
      createFooterLogoTextAndSocials({ track }),
      createFooterLogoWithSimpleText({ track }),
    ],
  };
};
