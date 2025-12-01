<h1 align="center"><img height="150" src="https://maily.to/brand/icon.svg" /><br> @maily.to/core</h1>

<p align="center">
  <a href="https://github.com/arikchakma/maily.to/blob/main/license">
    <img src="https://img.shields.io/badge/License-MIT-222222.svg" />
  </a>
  <a href="https://maily.to">
    <img src="https://img.shields.io/badge/%E2%9C%A8-Get%20Editor-0a0a0a.svg?style=flat&colorA=0a0a0a" alt="Get Maily Editor" />
  </a>
</p>

> Currently, this package is under development. You can follow the progress [here](https://github.com/arikchakma/maily.to).

## Installation

```bash
pnpm add @maily-to/core

# for types
pnpm add -D @tiptap/core
```

## Usage

```tsx
import '@maily-to/core/style.css';

import { useState } from 'react';
import { Editor } from '@maily-to/core';
import type { Editor as TiptapEditor, JSONContent } from '@tiptap/core';

type AppProps = {
  contentJson: JSONContent;
};

function App(props: AppProps) {
  const { contentJson: defaultContentJson } = props;
  const [editor, setEditor] = useState<TiptapEditor>();

  return (
    <Editor
      contentJson={defaultContentJson}
      onCreate={setEditor}
      onUpdate={setEditor}
    />
  );
}
```

### Slash Commands

Slash commands let you interact with the editor by typing `/` followed by a command name. Commands are now organized into groups. Each group is an object with a `title` and a `commands` array. Every command within that array is a `BlockItem` that can either be a single command or a grouped command (with commands).

#### Basic Example

Suppose you have a couple of basic blocks, such as a text block or a heading block. You would organize them into a group like this:

```tsx
// omitting imports
import { text, heading1 } from '@maily-to/core/blocks';

<Editor
  blocks={[
    {
      title: 'Basic Blocks',
      commands: [text, heading1],
    },
  ]}
/>
```

> **Note:** The order of the groups and the order of commands within each group determine how they are displayed in the editor.

#### Grouped Command Blocks with Subcommands

Sometimes, you may want a single command to open a list of commands. For this, define a command with an `id` and a `commands` array. The `id` is used for the slash command query (for example, typing `/headers.` will show its subcommands).

```tsx
// omitting imports
<Editor
  blocks={[
    {
      title: 'Formatting',
      commands: [
        {
          title: 'Headers',
          // The id is used to filter commands; e.g. `/headers.` shows these subcommands.
          id: 'headers',
          searchTerms: ['header', 'title'],
          commands: [
            {
              title: 'Heading 1',
              searchTerms: ['h1', 'heading1'],
              command: ({ editor, range }) => {
                // Convert the current block to Heading 1.
              },
            },
            {
              title: 'Heading 2',
              searchTerms: ['h2', 'heading2'],
              command: ({ editor, range }) => {
                // Convert the current block to Heading 2.
              },
            },
            // Add more subcommands as needed.
          ],
        },
      ],
    },
  ]}
/>
```

In this setup, when the user types `/headers.`, the editor will display the available header subcommands.

> **Note:** Currently it only supports one level of depth for subcommands.

#### Custom Rendered Blocks

To render a custom block, you can pass a `render` function to the block object. The `render` function will receive the editor instance as an argument. You can return `null` if you don't want to render anything based on the editor's state.

```tsx
// omitting imports
<Editor
  blocks={[
    {
      title: 'Custom Blocks',
      commands: [
        {
          title: 'Custom Block',
          searchTerms: ['custom'],
          render: (editor) => {
            return <div>Custom Block</div>;
          },
        },
      ],
    },
  ]}
/>
```

### Variables

By default, variables are required. You can make them optional by setting the `required` property to `false`. When a variable is optional and not provided, a placeholder will be displayed in its place.

You can pass variables to the editor in two ways:

1. As an Array of Objects:

   For auto-suggestions of variables in the editor when you type `@`, pass the variables as an array of objects to the `variables` prop.

   ```tsx
   // (Omitted repeated imports)
   import { VariableExtension, getVariableSuggestions } from '@maily-to/core/extensions';

   <Editor
     extensions={[
       VariableExtension.configure({
         suggestions: getVariableSuggestions('@'),
         variables: [{
            name: 'currentTime',
            required: false,
         }],
       }),
     ]}
   />
   ```

2. As a Function:

   If the variables are dynamic and need to be generated based on the editor's state or other inputs, you can provide a function to the `variables` prop.

   ```tsx
   // (Omitted repeated imports)
   import { VariableExtension, getVariableSuggestions } from '@maily-to/core/extensions';

   <Editor
     extensions={[
       VariableExtension.configure({
         suggestions: getVariableSuggestions('@'),
         variables: ({ query, from, editor }) => {
           // magic goes here
           // query: the text after the trigger character
           // from: the context from where the variables are requested (repeat, variable)
           // editor: the editor instance
           if (from === 'repeat-variable') {
             // return variables for the Repeat block `each` key
             return [
               { name: 'notifications' },
               { name: 'comments' },
             ];
           }

           return [
             { name: 'currentDate' },
             { name: 'currentTime', required: false },
           ];
         },
       }),
     ]}
   />
   ```

> Keep it in mind that if you pass an array of variable object Maily will take care of the filtering based on the query. But if you pass a function you have to take care of the filtering.

### Extensions

Extensions are a way to extend the editor's functionality. You can add custom blocks, marks, or extend the editor's functionality using extensions.

```tsx
// (Omitted repeated imports)
import { MailyKit, VariableExtension, getVariableSuggestions } from '@maily-to/core/extensions';

<Editor
  extensions={[
    MailyKit.configure({
      // do disable the link card node
      linkCard: false,
    }),
    // it will extend the variable extension
    // and provide suggestions for variables
    VariableExtension.extend({
      addNodeView() {
        // now you can replace the default
        // VariableView with your custom view
        return ReactNodeViewRenderer(VariableView, {
          className: 'mly-relative mly-inline-block',
          as: 'div',
        });
      },
    }).configure({
      suggestions: getVariableSuggestions(variableTriggerCharacter),
    }),
  ]}
/>
```

Or, you can add your own custom extensions, like shown below:

```tsx
// (Omitted repeated imports)
import { CustomExtension } from './extensions/custom-extension';

<Editor
  extensions={[
    CustomExtension.configure({
      // your configuration
    }),
  ]}
/>
```

### Image Upload

To enable image upload, you need to pass the `ImageUploadExtension` extension to the editor. The `onImageUpload` function will be called when an image is being uploaded. You can use this function to upload the image to your server and return the URL.

```tsx
// (Omitted repeated imports)
import { ImageUploadExtension } from '@maily-to/core/extensions';

<Editor
  extensions={[
    ImageUploadExtension.configure({
      onImageUpload: async (file) => {
        // upload the image to wherever you want
        const url = await uploadImage(file);
        return url;
      },
    }),
  ]}
/>
```

See the [@maily-to/render](../render) package for more information on how to render the editor content to HTML.

<br/>

## Sponsors

Sponsorship at any level is appreciated and encouraged. If you built a paid product using Maily, consider one of the [sponsorship tiers](https://github.com/sponsors/arikchakma).

<br/>

<h3 align="center">Gold</h3>

<table align="center" style="justify-content: center;align-items: center;display: flex;">
  <tr>
    <td align="center">
      <p></p>
      <p></p>
      <a href="https://novu.co?ref=maily.to">
        <picture height="60px">
          <source media="(prefers-color-scheme: dark)" srcset="https://github.com/user-attachments/assets/5e2b9ef1-5ded-4863-995d-62c7e40f946a">
          <img alt="Novu Logo" height="60px" src="https://github.com/user-attachments/assets/d2fdaf14-2211-4946-ab67-a4ce547aabc0">
        </picture>
      </a>
      <p></p>
      <p></p>
    </td>
  </tr>
</table>

<br/>

## License

MIT &copy; [Arik Chakma](https://twitter.com/imarikchakma)
