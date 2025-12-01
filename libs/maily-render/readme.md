<div align="center"><img height="150" src="https://maily.to/brand/icon.svg" /></div>
<br>

<div align="center"><strong>@maily-to/render</strong></div>
<div align="center">Transform <a href="https://maily.to">Maily</a> content into HTML email templates.</div>
<br />

<p align="center">
  <a href="https://github.com/arikchakma/maily/blob/main/license">
    <img src="https://img.shields.io/badge/License-Non--Commercial-222222.svg" />
  </a>
  <a href="https://maily.to">
    	<img src="https://img.shields.io/badge/%E2%9C%A8-Get%20Editor-0a0a0a.svg?style=flat&colorA=0a0a0a" alt="Get Maily Editor" />
    </a>
</p>

<br>

## Install

Install `@maily-to/render` from your command line.

```sh
pnpm add @maily-to/render
```

<br>

## Getting started

Convert React components into a HTML string.

```ts
import { render } from '@maily-to/render';

const html = await render({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Hello World!',
        },
      ],
    },
  ],
});
```

### Variables

You can replace variables in the content.

```ts
import { Maily } from '@maily-to/render';

const maily = new Maily({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      attrs: { textAlign: 'left' },
      content: [
        {
          type: 'variable',
          attrs: {
            id: 'currentDate',
            fallback: 'now',
            showIfKey: null,
          },
        },
      ],
    },
  ],
});

maily.setVariableValue('currentDate', new Date().toISOString());
const html = await maily.render();
```

### Payloads

Payload values are used for the `Repeat` and `Show If` blocks.

```ts
// (Omitted repeated imports)

const maily = new Maily({
  type: 'doc',
  content: [
    {
      type: 'repeat',
      attrs: { each: 'items', showIfKey: null },
      content: [
        {
          type: 'paragraph',
          attrs: { textAlign: 'left' },
          content: [{ type: 'text', text: 'Hello' }],
        },
      ],
    },
  ],
});

maily.setPayloadValue('items', ['Alice', 'Bob', 'Charlie']);
const html = await maily.render();
```

## Contributions

Feel free to submit pull requests, create issues, or spread the word.

## License

Non-Commercial Use Only. See `LICENSE` for more information.
