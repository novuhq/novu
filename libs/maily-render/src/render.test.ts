import { Maily, render } from './index';

describe('render', () => {
  it('should replace variables with values', async () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'variable',
              attrs: {
                id: 'name',
                fallback: 'Buddy',
              },
            },
          ],
        },
      ],
    };

    const maily = new Maily(content);
    maily.setVariableValue('name', 'John Doe');
    const result = await maily.render({
      plainText: true,
    });

    expect(result).toMatchInlineSnapshot(`"John Doe"`);
  });

  it('should replace variables with default formatted value', async () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'variable',
              attrs: {
                id: 'name',
                fallback: 'Buddy',
              },
            },
          ],
        },
      ],
    };
    const result = await render(content, {
      plainText: true,
    });
    expect(result).toMatchInlineSnapshot(`"{{name,fallback=Buddy}}"`);
  });

  it('should replace variables formatter with custom formatter', async () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'variable',
              attrs: {
                id: 'name',
                fallback: 'Buddy',
              },
            },
          ],
        },
      ],
    };

    const maily = new Maily(content);
    maily.setVariableFormatter((options) => {
      const { fallback, variable } = options;
      return `[${variable},fallback=${fallback}]`;
    });
    const result = await maily.render({
      plainText: true,
    });

    expect(result).toMatchInlineSnapshot(`"[name,fallback=Buddy]"`);
  });

  it('should replace variables with fallback value', async () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'variable',
              attrs: {
                id: 'name',
                fallback: 'Buddy',
              },
            },
          ],
        },
      ],
    };

    const maily = new Maily(content);
    maily.setShouldReplaceVariableValues(true);
    const result = await maily.render({
      plainText: true,
    });

    expect(result).toMatchInlineSnapshot(`"Buddy"`);
  });

  it('should replace links with setLinkValue value', async () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: {
            textAlign: 'left',
          },
          content: [
            {
              type: 'text',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: 'https://maily.to',
                    target: '_blank',
                    rel: 'noopener noreferrer nofollow',
                    class: null,
                  },
                },
              ],
              text: 'maily.to',
            },
          ],
        },
      ],
    };

    const maily = new Maily(content);
    maily.setLinkValue('https://maily.to', 'https://maily.to/playground');
    const result = await maily.render({
      plainText: true,
    });

    expect(result).toMatchInlineSnapshot(`"maily.to https://maily.to/playground"`);
  });

  it("should replace unsubscribe_url in button's href", async () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'button',
          attrs: {
            mailyComponent: 'button',
            text: 'Unsubscribe',
            url: 'unsubscribe_url',
            isUrlVariable: true,
            alignment: 'left',
            variant: 'filled',
            borderRadius: 'smooth',
            buttonColor: 'rgb(0, 0, 0)',
            textColor: 'rgb(255, 255, 255)',
          },
        },
      ],
    };

    const maily = new Maily(content);
    maily.setVariableValue('unsubscribe_url', 'https://maily.to/unsubscribe_url');
    const result = await maily.render({
      plainText: true,
    });

    expect(result).toMatchInlineSnapshot(`"Unsubscribe https://maily.to/unsubscribe_url"`);
  });

  it('should apply custom theme', async () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Custom Heading' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Custom Paragraph' }],
        },
      ],
    };

    const customTheme = {
      colors: {
        heading: 'rgb(255, 0, 0)',
        paragraph: 'rgb(0, 255, 0)',
      },
      fontSize: {
        paragraph: { fontSize: '18px' },
      },
    };

    const maily = new Maily(content);
    maily.setTheme(customTheme);
    const result = await maily.render();

    expect(result).toContain('color:rgb(255, 0, 0)');
    expect(result).toContain('color:rgb(0, 255, 0)');
    expect(result).toContain('font-size:18px');
  });

  it('should render repeated content with iterations limit', async () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'repeat',
          attrs: {
            each: 'items',
            iterations: 2,
            showIfKey: '',
          },
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Item: ',
                },
                {
                  type: 'variable',
                  attrs: {
                    id: '$value',
                    fallback: 'Unknown',
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const maily = new Maily(content);
    maily.setPayloadValue('items', ['First', 'Second', 'Third']);
    const result = await maily.render({
      plainText: true,
    });

    expect(result).toMatchInlineSnapshot(`"Item: First\n\nItem: Second"`);
  });
});
