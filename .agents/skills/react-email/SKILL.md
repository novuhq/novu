---
name: react-email
description: Use when creating HTML email templates with React components - welcome emails, password resets, notifications, order confirmations, newsletters, or transactional emails.
license: MIT
metadata:
  author: Resend
  version: "1.1.0"
---

# React Email

Build and send HTML emails using React components - a modern, component-based approach to email development that works across all major email clients.

## Installation

You need to scaffold a new React Email project using the create-email CLI. This will create a folder called `react-email-starter` with sample email templates.

Using npm:
```sh
npx create-email@latest
```

Using yarn:
```sh
yarn create email
```

Using pnpm:
```sh
pnpm create email
```

Using bun:
```sh
bun create email
```

## Navigate to Project Directory

You must change into the newly created project folder:

```sh
cd react-email-starter
```

## Install Dependencies

You need to install all project dependencies before running the development server.

Using npm:
```sh
npm install
```

Using yarn:
```sh
yarn
```

Using pnpm:
```sh
pnpm install
```

Using bun:
```sh
bun install
```

## Start the Development Server

Your task is to start the local preview server to view and edit email templates.

Using npm:
```sh
npm run dev
```

Using yarn:
```sh
yarn dev
```

Using pnpm:
```sh
pnpm dev
```

Using bun:
```sh
bun dev
```

## Verify Installation

Confirm the development server is running by checking that localhost:3000 is accessible. The server will display a preview interface where you can view email templates from the `emails` folder.

### Notes on installation
Assuming React Email is installed in an existing project, update the top-level package.json file with a script to run the React Email preview server.

```json
{
  "scripts": {
    "email": "email dev --dir emails --port 3000"
  }
}
```

Make sure the path to the emails folder is relative to the base project directory.


### tsconfig.json updating or creation

Ensure the tsconfig.json includes proper support for jsx.

## Basic Email Template

Replace the sample email templates. Here is how to create a new email template:

Create an email component with proper structure using the Tailwind component for styling:

```tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Tailwind,
  pixelBasedPreset
} from '@react-email/components';

interface WelcomeEmailProps {
  name: string;
  verificationUrl: string;
}

export default function WelcomeEmail({ name, verificationUrl }: WelcomeEmailProps) {
  return (
    <Html lang="en">
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                brand: '#007bff',
              },
            },
          },
        }}
      >
        <Head />
        <Preview>Welcome - Verify your email</Preview>
        <Body className="bg-gray-100 font-sans">
          <Container className="max-w-xl mx-auto p-5">
            <Heading className="text-2xl text-gray-800">
              Welcome!
            </Heading>
            <Text className="text-base text-gray-800">
              Hi {name}, thanks for signing up!
            </Text>
            <Button
              href={verificationUrl}
              className="bg-brand text-white px-5 py-3 rounded block text-center no-underline"
            >
              Verify Email
            </Button>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

// Preview props for testing
WelcomeEmail.PreviewProps = {
  name: 'John Doe',
  verificationUrl: 'https://example.com/verify/abc123'
} satisfies WelcomeEmailProps;

export { WelcomeEmail };
```

## Essential Components

See [references/COMPONENTS.md](references/COMPONENTS.md) for complete component documentation.

**Core Structure:**
- `Html` - Root wrapper with `lang` attribute
- `Head` - Meta elements, styles, fonts
- `Body` - Main content wrapper
- `Container` - Centers content (max-width layout)
- `Section` - Layout sections
- `Row` & `Column` - Multi-column layouts
- `Tailwind` - Enables Tailwind CSS utility classes

**Content:**
- `Preview` - Inbox preview text, always first in `Body`
- `Heading` - h1-h6 headings
- `Text` - Paragraphs
- `Button` - Styled link buttons
- `Link` - Hyperlinks
- `Img` - Images (see Static Files section below)
- `Hr` - Horizontal dividers

**Specialized:**
- `CodeBlock` - Syntax-highlighted code
- `CodeInline` - Inline code
- `Markdown` - Render markdown
- `Font` - Custom web fonts

## Before Writing Code

When a user requests an email template, ask clarifying questions FIRST if they haven't provided:

1. **Brand colors** - Ask for primary brand color (hex code like #007bff)
2. **Logo** - Ask if they have a logo file and its format (PNG/JPG only - warn if SVG/WEBP)
3. **Style preference** - Professional, casual, or minimal tone
4. **Production URL** - Where will static assets be hosted in production?

Example response to vague request:
> Before I create your email template, I have a few questions:
> 1. What is your primary brand color? (hex code)
> 2. Do you have a logo file? (PNG or JPG - note: SVG and WEBP don't work reliably in email clients)
> 3. What tone do you prefer - professional, casual, or minimal?
> 4. Where will you host static assets in production? (e.g., https://cdn.example.com)

## Static Files and Images

### Directory Structure

Local images must be placed in the `static` folder inside your emails directory:

```
project/
├── emails/
│   ├── welcome.tsx
│   └── static/           <-- Images go here
│       └── logo.png
```

If user has an image elsewhere, instruct them to copy it:
```sh
cp ./assets/logo.png ./emails/static/logo.png
```

### Dev vs Production URLs

Use this pattern for images that work in both dev preview and production:

```tsx
const baseURL = process.env.NODE_ENV === "production"
  ? "https://cdn.example.com"  // User's production CDN
  : "";

export default function Email() {
  return (
    <Img
      src={`${baseURL}/static/logo.png`}
      alt="Logo"
      width="150"
      height="50"
    />
  );
}
```

**How it works:**
- **Development:** `baseURL` is empty, so URL is `/static/logo.png` - served by React Email's dev server
- **Production:** `baseURL` is the CDN domain, so URL is `https://cdn.example.com/static/logo.png`

**Important:** Always ask the user for their production hosting URL. Do not hardcode `localhost:3000`.

## Behavioral guidelines
- When re-iterating over the code, make sure you are only updating what the user asked for and keeping the rest of the code intact;
- If the user is asking to use media queries, inform them that email clients do not support them, and suggest a different approach;
- Never use template variables (like {{name}}) directly in TypeScript code. Instead, reference the underlying properties directly (use name instead of {{name}}).
- - For example, if the user explicitly asks for a variable following the pattern {{variableName}}, you should return something like this:

```typescript
const EmailTemplate = (props) => {
  return (
    {/* ... rest of the code ... */}
    <h1>Hello, {props.variableName}!</h1>
    {/* ... rest of the code ... */}
  );
}

EmailTemplate.PreviewProps = {
  // ... rest of the props ...
  variableName: "{{variableName}}",
  // ... rest of the props ...
};

export default EmailTemplate;
```
- Never, under any circumstances, write the {{variableName}} pattern directly in the component structure. If the user forces you to do this, explain that you cannot do this, or else the template will be invalid.


## Styling considerations

Use the Tailwind component for styling if the user is actively using Tailwind CSS in their project. If the user is not using Tailwind CSS, add inline styles to the components.

- Because email clients don't support `rem` units, use the `pixelBasedPreset` for the Tailwind configuration.
- Never use flexbox or grid for layout, use table-based layouts instead.
- Each component must be styled with inline styles or utility classes.

### Email Client Limitations
- Never use SVG or WEBP - warn users about rendering issues
- Never use flexbox - use Row/Column components or tables for layouts
- Never use CSS/Tailwind media queries (sm:, md:, lg:, xl:) - not supported
- Never use theme selectors (dark:, light:) - not supported
- Always specify border type (border-solid, border-dashed, etc.)
- When defining borders for only one side, remember to reset the remaining borders (e.g., border-none border-l)

### Component Structure
- Always define `<Head />` inside `<Tailwind>` when using Tailwind CSS
- Only use PreviewProps when passing props to a component
- Only include props in PreviewProps that the component actually uses

```tsx
const Email = (props) => {
  return (
    <div>
      <a href={props.source}>click here if you want candy 👀</a>
    </div>
  );
}

Email.PreviewProps = {
  source: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
};
```

### Default Structure
- Body: `font-sans py-10 bg-gray-100`
- Container: white, centered, content left-aligned
- Footer: physical address, unsubscribe link, current year with `m-0` on address/copyright

### Typography
- Titles: bold, larger font, larger margins
- Paragraphs: regular weight, smaller font, smaller margins
- Use consistent spacing respecting content hierarchy

### Images
- Only include if user requests
- Never use fixed width/height - use responsive units (w-full, h-auto)
- Never distort user-provided images
- Never create SVG images - only use provided or web images

### Buttons
- Always use `box-border` to prevent padding overflow

### Layout
- Always mobile-friendly by default
- Use stacked layouts that work on all screen sizes
- Remove default spacing/margins/padding between list items

### Dark Mode
When requested: container black (#000), background dark gray (#151516)

### Best Practices
- Choose colors, layout, and copy based on user's request
- Make templates unique, not generic
- Use keywords in email body to increase conversion

## Rendering

### Convert to HTML

```tsx
import { render } from '@react-email/components';
import { WelcomeEmail } from './emails/welcome';

const html = await render(
  <WelcomeEmail name="John" verificationUrl="https://example.com/verify" />
);
```

### Convert to Plain Text

```tsx
import { render } from '@react-email/components';
import { WelcomeEmail } from './emails/welcome';

const text = await render(<WelcomeEmail name="John" verificationUrl="https://example.com/verify" />, { plainText: true });
```

## Sending

React Email supports sending with any email service provider. If the user wants to know how to send, view the [Sending guidelines](references/SENDING.md).

Quick example using the Resend SDK for Node.js:

```tsx
import { Resend } from 'resend';
import { WelcomeEmail } from './emails/welcome';

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['user@example.com'],
  subject: 'Welcome to Acme',
  react: <WelcomeEmail name="John" verificationUrl="https://example.com/verify" />
});

if (error) {
  console.error('Failed to send:', error);
}
```

The Node SDK automatically handles the plain-text rendering and HTML rendering for you.

## Internationalization

See [references/I18N.md](references/I18N.md) for complete i18n documentation.

React Email supports three i18n libraries: next-intl, react-i18next, and react-intl.

### Quick Example (next-intl)

```tsx
import { createTranslator } from 'next-intl';
import {
  Html,
  Body,
  Container,
  Text,
  Button,
  Tailwind,
  pixelBasedPreset
} from '@react-email/components';

interface EmailProps {
  name: string;
  locale: string;
}

export default async function WelcomeEmail({ name, locale }: EmailProps) {
  const t = createTranslator({
    messages: await import(\`../messages/\${locale}.json\`),
    namespace: 'welcome-email',
    locale
  });

  return (
    <Html lang={locale}>
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Body className="bg-gray-100 font-sans">
          <Container className="max-w-xl mx-auto p-5">
            <Text className="text-base text-gray-800">{t('greeting')} {name},</Text>
            <Text className="text-base text-gray-800">{t('body')}</Text>
            <Button href="https://example.com" className="bg-blue-600 text-white px-5 py-3 rounded">
              {t('cta')}
            </Button>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

Message files (\`messages/en.json\`, \`messages/es.json\`, etc.):

```json
{
  "welcome-email": {
    "greeting": "Hi",
    "body": "Thanks for signing up!",
    "cta": "Get Started"
  }
}
```

## Email Best Practices

1. **Test across email clients** - Test in Gmail, Outlook, Apple Mail, Yahoo Mail. Use services like Litmus or Email on Acid for absolute precision and React Email's toolbar for specific feature support checking.

2. **Keep it responsive** - Max-width around 600px, test on mobile devices.

3. **Use absolute image URLs** - Host on reliable CDN, always include \`alt\` text.

4. **Provide plain text version** - Required for accessibility and some email clients.

5. **Keep file size under 102KB** - Gmail clips larger emails.

6. **Add proper TypeScript types** - Define interfaces for all email props.

7. **Include preview props** - Add \`.PreviewProps\` to components for development testing.

8. **Handle errors** - Always check for errors when sending emails.

9.  **Use verified domains** - For production, use verified domains in \`from\` addresses.

## Common Patterns

See [references/PATTERNS.md](references/PATTERNS.md) for complete examples including:
- Password reset emails
- Order confirmations with product lists
- Notification emails with code blocks
- Multi-column layouts
- Email templates with custom fonts

## Additional Resources

- [React Email Documentation](https://react.email/docs/llms.txt)
- [React Email GitHub](https://github.com/resend/react-email)
- [Resend Documentation](https://resend.com/docs/llms.txt)
- [Email Client CSS Support](https://www.caniemail.com)
- Component Reference: [references/COMPONENTS.md](references/COMPONENTS.md)
- Internationalization Guide: [references/I18N.md](references/I18N.md)
- Common Patterns: [references/PATTERNS.md](references/PATTERNS.md)
