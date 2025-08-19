import { BlockItem } from '@maily-to/core/blocks';
import { EmailHeader } from '@/components/icons/email-header';
import { EmailHeaderCenteredLogoWithBorder } from '@/components/icons/email-header-centered-logo-with-border';
import { EmailHeaderLogoWithCoverImage } from '@/components/icons/email-header-logo-with-cover-image';
import { EmailHeaderLogoWithText } from '@/components/icons/email-header-logo-with-text';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';

export const createHeaderCenteredLogoWithBorder: (props: { track: ReturnType<typeof useTelemetry> }) => BlockItem = (
  props
) => {
  const { track } = props;

  return {
    title: 'Centered logo with border',
    description: 'Header with logo and border',
    searchTerms: ['logo', 'text'],
    preview: '/images/email-editor/header-centered-logo-with-border-preview.png',
    icon: <EmailHeaderCenteredLogoWithBorder className="size-4" />,
    command: ({ editor, range }) => {
      track(TelemetryEvent.EMAIL_BLOCK_ADDED, {
        type: 'header',
      });

      editor
        .chain()
        .deleteRange(range)
        .insertContent({
          type: 'section',
          attrs: {
            showIfKey: null,
            backgroundColor: '#FFFFFF',
            borderWidth: 0,
          },
          content: [
            { type: 'horizontalRule' },
            {
              type: 'image',
              attrs: {
                src: 'https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/logo.png',
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
              attrs: { textAlign: 'center', level: 3, showIfKey: null },
              content: [{ type: 'text', text: 'Company' }],
            },
          ],
        })
        .run();
    },
  };
};

export const createHeaderLogoWithText: (props: { track: ReturnType<typeof useTelemetry> }) => BlockItem = (props) => {
  const { track } = props;

  return {
    title: 'Logo with Text',
    description: 'Header with logo & text',
    searchTerms: ['logo', 'text'],
    preview: '/images/email-editor/header-logo-with-text-preview.png',
    icon: <EmailHeaderLogoWithText className="size-4" />,
    command: ({ editor, range }) => {
      track(TelemetryEvent.EMAIL_BLOCK_ADDED, {
        type: 'header',
      });

      editor
        .chain()
        .deleteRange(range)
        .insertContent({
          type: 'section',
          attrs: { showIfKey: null, backgroundColor: '#FFFFFF', borderWidth: 0 },
          content: [
            {
              type: 'columns',
              attrs: { showIfKey: null, gap: 8, backgroundColor: '#FFFFFF', borderWidth: 0, borderTopWidth: 2 },
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
                        src: 'https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/logo.png',
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
            },
          ],
        })
        .run();
    },
  };
};

export const createHeaderLogoWithCoverImage: (props: { track: ReturnType<typeof useTelemetry> }) => BlockItem = (
  props
) => {
  const { track } = props;

  return {
    title: 'Logo with cover image',
    description: 'Header with logo & cover image',
    searchTerms: ['logo', 'cover', 'image'],
    icon: <EmailHeaderLogoWithCoverImage className="size-4" />,
    preview: '/images/email-editor/header-logo-with-cover-image-preview.webp',
    command: ({ editor, range }) => {
      track(TelemetryEvent.EMAIL_BLOCK_ADDED, {
        type: 'header',
      });

      const todayFormatted = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      editor
        .chain()
        .deleteRange(range)
        .insertContent({
          type: 'section',
          attrs: { showIfKey: null, backgroundColor: '#FFFFFF', borderWidth: 0 },
          content: [
            {
              type: 'image',
              attrs: {
                src: 'https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/header-hero-image.webp',
                width: '100%',
                height: 'auto',
                alt: null,
                title: null,
                alignment: 'center',
                externalLink: null,
                isExternalLinkVariable: false,
                isSrcVariable: false,
                showIfKey: null,
                lockAspectRatio: false,
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
                        src: 'https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/logo.png',
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
          ],
        })
        .run();
    },
  };
};

export const createHeaders = (props: { track: ReturnType<typeof useTelemetry> }) => {
  const { track } = props;

  return {
    id: 'headers',
    title: 'Headers',
    description: 'Add a pre-made header block.',
    searchTerms: ['header', 'headers'],
    icon: <EmailHeader className="size-4" />,
    preview: '/images/email-editor/header-logo-with-cover-image-preview.webp',
    commands: [
      createHeaderLogoWithCoverImage({ track }),
      createHeaderCenteredLogoWithBorder({ track }),
      createHeaderLogoWithText({ track }),
    ],
  };
};
