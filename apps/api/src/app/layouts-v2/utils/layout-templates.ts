export const EMPTY_LAYOUT = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      attrs: { textAlign: null, showIfKey: null },
      content: [{ type: 'text', text: ' ' }],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'left', showIfKey: null },
      content: [
        {
          type: 'variable',
          attrs: {
            id: 'content',
            label: null,
            fallback: null,
            required: false,
            aliasFor: null,
          },
        },
      ],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: null, showIfKey: null },
      content: [{ type: 'text', text: ' ' }],
    },
  ],
};

export const createDefaultLayout = (organizationName: string) => ({
  type: 'doc',
  content: [
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
                borderRadius: 0,
                isSrcVariable: false,
                aspectRatio: null,
                lockAspectRatio: true,
                showIfKey: null,
                aliasFor: null,
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
            },
          ],
        },
      ],
    },
    {
      type: 'spacer',
      attrs: { height: 8, showIfKey: null },
    },
    {
      type: 'paragraph',
      attrs: { textAlign: null, showIfKey: null },
      content: [
        {
          type: 'variable',
          attrs: {
            id: 'content',
            label: null,
            fallback: null,
            required: false,
            aliasFor: null,
          },
        },
      ],
    },
    {
      type: 'spacer',
      attrs: { height: 8, showIfKey: null },
    },
    {
      type: 'columns',
      attrs: { showIfKey: null, gap: 0 },
      content: [
        {
          type: 'column',
          attrs: {
            columnId: '8a20f82f-ecb5-4cbd-923e-ff82f3bb9b79',
            width: '60',
            verticalAlign: 'top',
          },
          content: [
            {
              type: 'paragraph',
              attrs: { textAlign: null, showIfKey: null },
              content: [{ type: 'text', text: organizationName }],
            },
            {
              type: 'spacer',
              attrs: { height: 4, showIfKey: null },
            },
            {
              type: 'footer',
              attrs: { textAlign: null, 'maily-component': 'footer' },
              content: [
                {
                  type: 'text',
                  marks: [{ type: 'textStyle' }],
                  text: '1234 Example Street, DE 19801, United States',
                },
              ],
            },
          ],
        },
        {
          type: 'column',
          attrs: {
            columnId: 'cd30ba93-7a8f-4d03-b66a-88ae4fe99abf',
            width: '40',
            verticalAlign: 'top',
          },
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
                        href: 'https://novu.co/',
                        target: '_blank',
                        rel: 'noopener noreferrer nofollow',
                        class: null,
                        isUrlVariable: false,
                        aliasFor: null,
                      },
                    },
                  ],
                  text: 'Visit Company',
                },
                { type: 'text', text: ' | ' },
                {
                  type: 'text',
                  marks: [
                    {
                      type: 'link',
                      attrs: {
                        href: 'support@novu.co',
                        target: '_blank',
                        rel: 'noopener noreferrer nofollow',
                        class: null,
                        isUrlVariable: false,
                        aliasFor: null,
                      },
                    },
                  ],
                  text: 'Contact Us',
                },
              ],
            },
            {
              type: 'spacer',
              attrs: { height: 4, showIfKey: null },
            },
            {
              type: 'section',
              attrs: {
                borderRadius: 0,
                backgroundColor: '#FFFFFF',
                align: 'left',
                borderWidth: 0,
                borderColor: '#e2e2e2',
                paddingTop: 0,
                paddingRight: 0,
                paddingBottom: 0,
                paddingLeft: 0,
                marginTop: 0,
                marginRight: 0,
                marginBottom: 0,
                marginLeft: 0,
                showIfKey: null,
              },
              content: [
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
                        alt: null,
                        title: null,
                        externalLink: 'https://www.linkedin.com/company/novuco/',
                        isExternalLinkVariable: false,
                        aliasFor: null,
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
                        externalLink: 'https://www.youtube.com/@novuhq',
                        isExternalLinkVariable: false,
                        aliasFor: null,
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
                        externalLink: 'https://x.com/novuhq',
                        isExternalLinkVariable: false,
                        aliasFor: null,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'spacer',
      attrs: { height: 8, showIfKey: null },
    },
  ],
});
