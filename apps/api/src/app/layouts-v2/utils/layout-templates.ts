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
      type: 'section',
      attrs: {
        borderRadius: 0,
        backgroundColor: '#FFFFFF',
        align: 'left',
        borderWidth: 0,
        borderColor: '#FFFFFF',
        paddingTop: 12,
        paddingRight: 12,
        paddingBottom: 12,
        paddingLeft: 12,
        showIfKey: null,
      },
      content: [
        {
          type: 'image',
          attrs: {
            src: 'https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/logo.png',
            alt: null,
            title: null,
            width: 48,
            height: 48,
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
        {
          type: 'paragraph',
          attrs: { textAlign: null, showIfKey: null },
          content: [
            {
              type: 'variable',
              attrs: { id: 'content', label: null, fallback: null, required: false, aliasFor: null },
            },
            { type: 'text', text: ' ' },
          ],
        },
        {
          type: 'horizontalRule',
          attrs: {
            marginTop: 16,
            marginBottom: 6,
          },
        },
        {
          type: 'section',
          attrs: {
            borderRadius: 0,
            backgroundColor: '',
            align: 'left',
            borderWidth: 0,
            borderColor: '',
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
              attrs: { textAlign: 'center', showIfKey: null },
              content: [
                {
                  type: 'text',
                  marks: [{ type: 'textStyle', attrs: { color: 'rgb(170, 170, 170)' } }],
                  text: `From ${organizationName} with ❤️`,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
