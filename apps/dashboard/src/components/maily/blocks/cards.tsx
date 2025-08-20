import { BlockItem } from '@maily-to/core/blocks';
import { CardBlocks } from '@/components/icons/cards-blocks';
import { HorizontalCardWithImage } from '@/components/icons/horizontal-card-with-image';
import { InformationCardWithLogo } from '@/components/icons/information-card-with-logo';
import { ParagraphWithImage } from '@/components/icons/paragraph-with-image';
import { Badge } from '@/components/primitives/badge';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { BlockCustomPreview } from './block-custom-preview';

const createHorizontalCardWithCta: (props: { track: ReturnType<typeof useTelemetry> }) => BlockItem = (props) => {
  const { track } = props;

  return {
    title: 'Horizontal card with image',
    description: 'Card: Horizontal information card with CTA',
    searchTerms: ['logo', 'text', 'image', 'horizontal', 'card'],
    preview: () => (
      <BlockCustomPreview
        src="/images/email-editor/horizontal-card-with-image-preview.webp"
        alt="Cards"
        description="Card: Horizontal information card with CTA"
      />
    ),
    icon: <HorizontalCardWithImage className="size-4" />,
    command: ({ editor, range }) => {
      track(TelemetryEvent.CARD_BLOCK_ADDED, {
        type: 'card',
      });

      editor
        .chain()
        .deleteRange(range)
        .insertContent({
          type: 'columns',
          attrs: { showIfKey: null, gap: 18 },
          content: [
            {
              type: 'column',
              attrs: {
                width: 'auto',
              },
              content: [
                {
                  type: 'image',
                  attrs: {
                    src: 'https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/header-hero-image.webp',
                    alt: null,
                    title: null,
                    alignment: 'center',
                    externalLink: null,
                    isExternalLinkVariable: false,
                    isSrcVariable: false,
                    showIfKey: null,
                    height: '208',
                    width: '282',
                    borderRadius: 8,
                    lockAspectRatio: false,
                  },
                },
              ],
            },
            {
              type: 'column',
              attrs: {
                width: 'auto',
              },
              content: [
                {
                  type: 'paragraph',
                  attrs: { textAlign: null, showIfKey: null },
                  content: [
                    {
                      type: 'text',
                      marks: [{ type: 'bold' }],
                      text: 'Multi-Environment support',
                    },
                  ],
                },
                { type: 'spacer', attrs: { height: 8, showIfKey: null } },
                {
                  type: 'paragraph',
                  attrs: { textAlign: null, showIfKey: null },
                  content: [
                    {
                      type: 'text',
                      text: "Novu's Multi-Environment Support introduces a structured, secure, and efficient way to handle your notification workflows at every stage.",
                    },
                  ],
                },
                { type: 'spacer', attrs: { height: 32, showIfKey: null } },
                {
                  type: 'button',
                  attrs: {
                    text: 'Learn more',
                    isTextVariable: false,
                    isUrlVariable: false,
                    alignment: 'right',
                    variant: 'filled',
                    borderRadius: 'smooth',
                    buttonColor: '#f8f8f8',
                    textColor: '#141313',
                    showIfKey: null,
                    paddingTop: 6,
                    paddingRight: 24,
                    paddingBottom: 6,
                    paddingLeft: 24,
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

const createCardWithImageAndCta: (props: { track: ReturnType<typeof useTelemetry> }) => BlockItem = (props) => {
  const { track } = props;

  return {
    title: 'Paragraph with image',
    description: 'Card with paragraph, CTA & image',
    searchTerms: ['card', 'cta', 'image', 'paragraph'],
    icon: <ParagraphWithImage className="size-4" />,
    preview: () => (
      <BlockCustomPreview
        src="/images/email-editor/paragraph-with-image-preview.webp"
        description="Card with paragraph, CTA & image"
        alt="Paragraph with image"
      />
    ),
    command: ({ editor, range }) => {
      track(TelemetryEvent.CARD_BLOCK_ADDED, {
        type: 'card',
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
            { type: 'spacer', attrs: { height: 8, showIfKey: null } },
            {
              type: 'heading',
              attrs: { textAlign: null, level: 3, showIfKey: null },
              content: [
                { type: 'text', text: 'Your free trial ends on ' },
                {
                  type: 'variable',
                  attrs: {
                    id: 'payload.dueDate',
                    label: null,
                    fallback: null,
                    required: false,
                    aliasFor: null,
                  },
                },
                { type: 'text', text: ' ' },
              ],
            },
            {
              type: 'section',
              attrs: { showIfKey: null, backgroundColor: '#FFFFFF', borderWidth: 0 },
              content: [
                {
                  type: 'paragraph',
                  attrs: { textAlign: null, showIfKey: null },
                  content: [
                    {
                      type: 'text',
                      text: 'Your free trial for Novu Business Events and 1 more product with Novu US, Inc. will end soon. You have an upcoming payment on ',
                    },
                    {
                      type: 'variable',
                      attrs: {
                        id: 'payload.dueDate',
                        label: null,
                        fallback: null,
                        required: false,
                        aliasFor: null,
                      },
                    },
                  ],
                },
                { type: 'spacer', attrs: { height: 24, showIfKey: null } },
                {
                  type: 'paragraph',
                  attrs: { textAlign: null, showIfKey: null },
                  content: [
                    {
                      type: 'text',
                      marks: [{ type: 'textStyle', attrs: { color: '' } }],
                      text: 'If you add a payment method, the added payment method will be charged $250.00 or more every month, depending on usage.',
                    },
                  ],
                },
                { type: 'spacer', attrs: { height: 24, showIfKey: null } },
                {
                  type: 'button',
                  attrs: {
                    text: 'Pay now',
                    isTextVariable: false,
                    url: '',
                    isUrlVariable: false,
                    alignment: 'center',
                    variant: 'filled',
                    borderRadius: 'smooth',
                    buttonColor: '#f8f8f8',
                    textColor: '#141313',
                    showIfKey: null,
                    width: '100%',
                    paddingTop: 6,
                    paddingRight: 24,
                    paddingBottom: 6,
                    paddingLeft: 24,
                  },
                },
                { type: 'spacer', attrs: { height: 16, showIfKey: null } },

                { type: 'horizontalRule' },
              ],
            },
          ],
        })
        .run();
    },
  };
};

const createInformationCardWithLogo: (props: { track: ReturnType<typeof useTelemetry> }) => BlockItem = (props) => {
  const { track } = props;

  return {
    title: 'Information card with logo',
    description: 'Card: information card with logo',
    searchTerms: ['logo', 'text', 'information', 'card'],
    preview: () => (
      <BlockCustomPreview
        src="/images/email-editor/information-card-with-logo-preview.webp"
        alt="Information card with logo"
        description="Card: information card with logo"
      />
    ),
    icon: <InformationCardWithLogo className="size-4" />,
    command: ({ editor, range }) => {
      track(TelemetryEvent.CARD_BLOCK_ADDED, {
        type: 'card',
      });

      editor
        .chain()
        .deleteRange(range)
        .insertContent({
          type: 'section',
          attrs: {
            borderRadius: 6,
            backgroundColor: '#f8f8f8',
            align: 'left',
            borderWidth: 2,
            borderColor: '#f8f8f8',
            paddingTop: 16,
            paddingRight: 16,
            paddingBottom: 16,
            paddingLeft: 16,
            marginTop: 0,
            marginRight: 0,
            marginBottom: 0,
            marginLeft: 0,
            showIfKey: null,
          },
          content: [
            {
              type: 'columns',
              attrs: { showIfKey: null, gap: 12 },
              content: [
                {
                  type: 'column',
                  attrs: {
                    width: 5,
                    verticalAlign: 'top',
                  },
                  content: [
                    {
                      type: 'paragraph',
                      attrs: { textAlign: 'center', showIfKey: null },
                      content: [
                        {
                          type: 'inlineImage',
                          attrs: {
                            height: 16,
                            width: 16,
                            src: 'https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/check-icon.png',
                            isSrcVariable: false,
                            alt: null,
                            title: null,
                            externalLink: null,
                            isExternalLinkVariable: false,
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'column',
                  attrs: {
                    width: 'auto',
                    verticalAlign: 'top',
                  },
                  content: [
                    {
                      type: 'paragraph',
                      attrs: { textAlign: null, showIfKey: null },
                      content: [
                        {
                          type: 'text',
                          marks: [{ type: 'bold' }],
                          text: 'Discover new automation techniques.',
                        },
                      ],
                    },
                    { type: 'spacer', attrs: { height: 8, showIfKey: null } },
                    {
                      type: 'paragraph',
                      attrs: { textAlign: null, showIfKey: null },
                      content: [
                        {
                          type: 'text',
                          text: 'Get insider tips on how to achieve powerful outcomes from pro automators, including John Doe, the #1 New York.',
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

export const createCards = (props: { track: ReturnType<typeof useTelemetry> }) => {
  const { track } = props;

  return {
    id: 'cards',
    title: 'Cards',
    description: 'Add pre-made cards',
    searchTerms: ['card', 'cards'],
    icon: <CardBlocks className="size-4" />,
    preview: () => (
      <BlockCustomPreview
        src="/images/email-editor/horizontal-card-with-image-preview.webp"
        alt="Cards"
        description="Add pre-made cards"
      />
    ),
    render: () => {
      return (
        <>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
            <CardBlocks className="size-4" />
          </div>
          <div className="grow">
            <p className="flex items-center gap-1 font-medium">
              Cards
              <Badge color="orange" size="sm" variant="lighter">
                New
              </Badge>
            </p>
            <p className="text-xs text-gray-400">Add pre-made cards</p>
          </div>
          <span className="block px-1 text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-chevron-right size-3.5 stroke-[2.5]"
            >
              <path d="m9 18 6-6-6-6"></path>
            </svg>
          </span>
        </>
      );
    },

    commands: [
      createCardWithImageAndCta({ track }),
      createHorizontalCardWithCta({ track }),
      createInformationCardWithLogo({ track }),
    ],
  };
};
