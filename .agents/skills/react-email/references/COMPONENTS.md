# React Email Components Reference

Complete reference for all React Email components. All examples use the Tailwind component for styling.

**Important:** Only import the components you need. Do not use components in the code if you are not importing them.

## Available Components

All components are imported from `@react-email/components`:

- **Body** - A React component to wrap emails
- **Button** - A link that is styled to look like a button
- **CodeBlock** - Display code with a selected theme and regex highlighting using Prism.js
- **CodeInline** - Display a predictable inline code HTML element that works on all email clients
- **Column** - Display a column that separates content areas vertically in your email (must be used with Row)
- **Container** - A layout component that centers your content horizontally on a breaking point
- **Font** - A React Font component to set your fonts
- **Head** - Contains head components, related to the document such as style and meta elements
- **Heading** - A block of heading text
- **Hr** - Display a divider that separates content areas in your email
- **Html** - A React html component to wrap emails
- **Img** - Display an image in your email
- **Link** - A hyperlink to web pages, email addresses, or anything else a URL can address
- **Markdown** - A Markdown component that converts markdown to valid react-email template code
- **Preview** - A preview text that will be displayed in the inbox of the recipient
- **Row** - Display a row that separates content areas horizontally in your email
- **Section** - Display a section that can also be formatted using rows and columns
- **Tailwind** - A React component to wrap emails with Tailwind CSS
- **Text** - A block of text separated by blank spaces

## Tailwind

The recommended way to style React Email components. Wrap your email content and use utility classes.

```tsx
import { Tailwind, pixelBasedPreset, Html, Body, Container, Heading, Text, Button } from '@react-email/components';

export default function Email() {
  return (
    <Html lang="en">
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                brand: '#007bff',
                accent: '#28a745'
              },
            },
          },
        }}
      >
        <Body className="bg-gray-100 font-sans">
          <Container className="max-w-xl mx-auto p-5">
            <Heading className="text-2xl font-bold text-brand mb-4">
              Welcome!
            </Heading>
            <Text className="text-base text-gray-700 mb-4">
              Your content here.
            </Text>
            <Button
              href="https://example.com"
              className="bg-brand text-white px-6 py-3 rounded-lg block text-center"
            >
              Get Started
            </Button>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

**Props:**
- `config` - Tailwind configuration object

**How it works:**
- Tailwind classes are converted to inline styles automatically
- Media queries are extracted to `<style>` tag in `<head>`
- CSS variables are resolved
- RGB color syntax is normalized for email client compatibility

**Important:**
- Always use `pixelBasedPreset` - email clients don't support `rem` units
- Custom config is optional - defaults work well
- Responsive classes (sm:, md:, lg:) work via media queries, but should be used with caution due to limited email client support

## Structural Components

### Html

Root wrapper for the email. Always use as the outermost component.

```tsx
import { Html, Tailwind, pixelBasedPreset } from '@react-email/components';

<Html lang="en" dir="ltr">
  <Tailwind config={{ presets: [pixelBasedPreset] }}>
    {/* email content */}
  </Tailwind>
</Html>
```

**Props:**
- `lang` - Language code (e.g., "en", "es", "fr")
- `dir` - Text direction ("ltr" or "rtl")

### Head

Contains head components, related to the document such as style and meta elements. Place inside `<Tailwind>`.

```tsx
import { Head } from '@react-email/components';

<Head>
  <title>Email Title</title>
</Head>
```

### Body

A React component to wrap emails.

```tsx
import { Body } from '@react-email/components';

<Body className="bg-gray-100 font-sans">
  {/* email content */}
</Body>
```

### Container

A layout component that centers your content horizontally on a breaking point. Has a max-width constraint of `37.5em`.

```tsx
import { Container } from '@react-email/components';

<Container className="max-w-xl mx-auto p-5">
  {/* centered content */}
</Container>
```

### Section

Display a section that can also be formatted using rows and columns.

```tsx
import { Section } from '@react-email/components';

<Section className="p-5 bg-white">
  {/* section content */}
</Section>
```

### Row & Column

Row displays content areas horizontally, Column displays content areas vertically. A Column needs to be used in combination with a Row component.

```tsx
import { Section, Row, Column } from '@react-email/components';

<Section>
  <Row>
    <Column className="w-1/2 p-2 align-top">
      Left column content
    </Column>
    <Column className="w-1/2 p-2 align-top">
      Right column content
    </Column>
  </Row>
</Section>
```

**Column widths:**
- Use percentage widths (e.g., "w-1/2", "w-1/3")
- Or use Tailwind's width utilities
- Total should add up to 100% or container width

## Content Components

### Preview

A preview text that will be displayed in the inbox of the recipient.

```tsx
import { Preview } from '@react-email/components';

<Preview>Welcome to our platform - Get started today!</Preview>
```

**Best practices:**
- Keep under 140 characters
- Make it compelling and action-oriented
- Should always be the first element inside `<Body>`

### Heading

A block of heading text (h1-h6).

```tsx
import { Heading } from '@react-email/components';

<Heading as="h1" className="text-2xl font-bold text-gray-800 mb-4">
  Welcome to Acme
</Heading>

<Heading as="h2" className="text-xl font-semibold text-gray-600 mb-3">
  Getting Started
</Heading>
```

**Props:**
- `as` - HTML heading level ("h1" through "h6")

### Text

A block of text separated by blank spaces.

```tsx
import { Text } from '@react-email/components';

<Text className="text-base leading-6 text-gray-800 my-4">
  Your paragraph content here.
</Text>
```

### Button

A link that is styled to look like a button. Has workaround for padding issues in Outlook.

```tsx
import { Button } from '@react-email/components';

<Button
  href="https://example.com/verify"
  target="_blank"
  className="bg-blue-600 text-white px-5 py-3 rounded block text-center no-underline font-medium"
>
  Verify Email Address
</Button>
```

**Props:**
- `href` (required) - URL to link to
- `target` - Default is "_blank"

**Styling tips:**
- Use `block` for full-width buttons
- Use `text-center` for centered text
- Add `no-underline` to remove underline

### Link

A hyperlink to web pages, email addresses, or anything else a URL can address.

```tsx
import { Link } from '@react-email/components';

<Link href="https://example.com" target="_blank" className="text-blue-600 underline">
  Visit our website
</Link>
```

**Props:**
- `href` (required) - URL to link to
- `target` - Default is "_blank"

### Img

Display an image in your email.

```tsx
import { Img } from '@react-email/components';

<Img
  src="https://example.com/logo.png"
  alt="Company Logo"
  width="150"
  height="50"
  className="block mx-auto"
/>
```

**Props:**
- `src` (required) - Image URL (must be absolute)
- `alt` (required) - Alt text for accessibility
- `width` - Image width in pixels
- `height` - Image height in pixels

**Best practices:**
- Always use absolute URLs hosted on CDN
- Always include alt text
- Specify width and height to prevent layout shift
- Use `block` class to avoid spacing issues

### Hr

Display a divider that separates content areas in your email.

```tsx
import { Hr } from '@react-email/components';

<Hr className="border-gray-200 my-5" />
```

## Specialized Components

### CodeBlock

Display code with a selected theme and regex highlighting using Prism.js.

```tsx
import { CodeBlock, dracula } from '@react-email/components';

const Email = () => {
  const code = `export default async (req, res) => {
  try {
    const html = await renderAsync(
      EmailTemplate({ firstName: 'John' })
    );
    return NextResponse.json({ html });
  } catch (error) {
    return NextResponse.json({ error });
  }
}`;

  return (
    <div className="overflow-auto">
      <CodeBlock
        fontFamily="monospace"
        theme={dracula}
        language="javascript"
        code={code}
      />
    </div>
  );
};
```

**Props:**
- `code` (required) - The actual code to render in the code block. Just a plain string, with the proper indentation included
- `language` (required) - The language under the supported languages defined in PrismLanguage (e.g., "javascript", "python", "typescript")
- `theme` (required) - The theme to use for the code block (import from "@react-email/components": dracula, github, nord, etc.)
- `fontFamily` (optional) - The font family to use for the code block (e.g., "monospace")
- `lineNumbers` (optional) - Whether or not to automatically include line numbers on the rendered code block (boolean, default: false)

**Important:**
- By default, do not use the `lineNumbers` prop unless specifically requested
- Always wrap the `CodeBlock` component in a `div` tag with the `overflow-auto` class to avoid padding overflow

### CodeInline

Display a predictable inline code HTML element that works on all email clients.

```tsx
import { Text, CodeInline } from '@react-email/components';

<Text className="text-base text-gray-800">
  Run <CodeInline className="bg-gray-100 px-1 rounded">npm install</CodeInline> to get started.
</Text>
```

### Markdown

A Markdown component that converts markdown to valid react-email template code.

```tsx
import { Html, Markdown } from '@react-email/components';

const Email = () => {
  return (
    <Html lang="en" dir="ltr">
      <Markdown
        markdownCustomStyles={{
          h1: { color: "red" },
          h2: { color: "blue" },
          codeInline: { background: "grey" },
        }}
        markdownContainerStyles={{
          padding: "12px",
          border: "solid 1px black",
        }}
      >{`# Hello, World!`}</Markdown>

      {/* OR */}

      <Markdown children={`# This is a ~~strikethrough~~`} />
    </Html>
  );
};
```

**Props:**
- `children` (required) - Markdown string
- `markdownCustomStyles` - Style overrides for HTML elements (h1, h2, p, a, codeInline, etc.)
- `markdownContainerStyles` - Styles for container div

### Font

A React Font component to set your fonts.

```tsx
import { Head, Font } from '@react-email/components';

<Head>
  <Font
    fontFamily="Roboto"
    fallbackFontFamily="Arial, sans-serif"
    webFont={{
      url: "https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2",
      format: "woff2"
    }}
  />
</Head>
```

**Props:**
- `fontFamily` (required) - Font family name
- `fallbackFontFamily` - Fallback fonts
- `webFont` - Object with `url` and `format`

**Supported formats:**
- woff2 (recommended)
- woff
- truetype
- opentype
