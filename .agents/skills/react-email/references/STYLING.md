# Styling Guide

Comprehensive styling reference for React Email templates.

## Styling Approach

Use the `Tailwind` component for styling if the project uses Tailwind CSS. Otherwise, use inline styles.

```tsx
import { Tailwind, pixelBasedPreset } from '@react-email/components';

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
  {/* Email content */}
</Tailwind>
```

## pixelBasedPreset

Email clients don't support `rem` units. Always use `pixelBasedPreset` in your Tailwind configuration to convert rem-based utilities to pixels:

```tsx
import { pixelBasedPreset } from '@react-email/components';

<Tailwind config={{ presets: [pixelBasedPreset] }}>
```

## Email Client Limitations

Email clients have significant CSS restrictions. Follow these rules:

### Unsupported Features

- **SVG/WEBP images** - Use PNG or JPEG only
- **Flexbox/Grid** - Use `Row`/`Column` components or tables
- **Media queries** - `sm:`, `md:`, `lg:`, `xl:` prefixes don't work
- **Theme selectors** - `dark:`, `light:` prefixes don't work
- **rem units** - Use `pixelBasedPreset` for pixel conversion

### Border Handling

Always specify border style and reset other sides when needed:

```tsx
// Correct - specify border style
<div className="border-solid border border-gray-300" />

// Correct - single side border with reset
<div className="border-none border-l border-solid border-l-gray-300" />

// Incorrect - missing border style
<div className="border border-gray-300" />
```

## Component Structure

### Head Placement

Always define `<Head />` inside `<Tailwind>` when using Tailwind CSS:

```tsx
<Html>
  <Tailwind config={{ presets: [pixelBasedPreset] }}>
    <Head />
    <Body>...</Body>
  </Tailwind>
</Html>
```

### PreviewProps

Only include props that the component actually uses:

```tsx
const Email = ({ source }: { source: string }) => {
  return (
    <div>
      <a href={source}>Click here</a>
    </div>
  );
};

Email.PreviewProps = {
  source: "https://example.com",
};
```

## Default Layout Structure

### Body

```tsx
<Body className="font-sans py-10 bg-gray-100">
```

### Container

White background, centered, left-aligned content:

```tsx
<Container className="mx-auto bg-white p-6 rounded">
```

### Footer

Include physical address, unsubscribe link, current year:

```tsx
<Section className="text-center text-gray-500 text-sm">
  <Text className="m-0">123 Main St, City, State 12345</Text>
  <Text className="m-0">&copy; {new Date().getFullYear()} Company Name</Text>
  <Link href={unsubscribeUrl}>Unsubscribe</Link>
</Section>
```

## Typography

### Titles

Bold, larger font, larger margins:

```tsx
<Heading className="text-2xl font-bold text-gray-900 mb-4">
```

### Paragraphs

Regular weight, smaller font, smaller margins:

```tsx
<Text className="text-base text-gray-700 mb-3">
```

### Hierarchy

Use consistent spacing that respects content hierarchy. Larger margins for headings, smaller for body text.

## Images

- Only include if user requests
- Content images: use responsive sizing (`w-full`, `h-auto`)
- Small icons (24-48px): fixed dimensions are acceptable
- Never distort user-provided images
- Never create SVG images
- Always use absolute URLs
- Include `alt` text for accessibility

```tsx
<Img
  src="https://example.com/image.png"
  alt="Description"
  className="w-full h-auto"
/>
```

## Buttons

Always use `box-border` to prevent padding overflow:

```tsx
<Button
  href="https://example.com"
  className="bg-blue-600 text-white px-5 py-3 rounded box-border block text-center no-underline"
>
  Click Here
</Button>
```

## Layout

### Mobile-First

Always design for mobile by default:

- Use stacked layouts that work on all screen sizes
- Max-width around 600px for main container
- Remove default spacing/margins/padding between list items

### Multi-Column

Use `Row` and `Column` components instead of flexbox/grid:

```tsx
<Row>
  <Column className="w-1/2">Left content</Column>
  <Column className="w-1/2">Right content</Column>
</Row>
```

## Dark Mode

When requested, use dark backgrounds:

- Container: black (`#000`)
- Background: dark gray (`#151516`)

```tsx
<Body className="bg-[#151516]">
  <Container className="bg-black text-white">
```

## Colors and Brand Consistency

### Gathering Brand Colors

Before creating emails, collect these colors from the user:

- **Primary**: Main brand color for buttons, links, key accents
- **Secondary**: Supporting color for borders, backgrounds, less prominent elements
- **Text**: Main body text color (suggest `#1a1a1a` for light backgrounds)
- **Text muted**: Secondary text like captions, footers (suggest `#6b7280`)
- **Background**: Email body background (suggest `#f4f4f5`)
- **Surface**: Container/card background (typically `#ffffff`)

### Tailwind Configuration File

Create a centralized Tailwind config file that all email templates import. Using `satisfies TailwindConfig` provides intellisense support for all configuration options:

```tsx
// emails/tailwind.config.ts
import { pixelBasedPreset, type TailwindConfig } from '@react-email/components';

export default {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#007bff',
          secondary: '#6c757d',
        },
      },
    },
  },
} satisfies TailwindConfig;

// For non-Tailwind brand assets (optional)
export const brandAssets = {
  logo: {
    src: 'https://example.com/logo.png',
    alt: 'Company Name',
    width: 120,
  },
};
```

### Using Tailwind Config

Import the shared config in every email template:

```tsx
import tailwindConfig, { brandAssets } from './tailwind.config';

<Tailwind config={tailwindConfig}>
  <Body className="bg-gray-100 font-sans">
    <Container className="bg-white p-6">
      <Img src={brandAssets.logo.src} alt={brandAssets.logo.alt} width={brandAssets.logo.width} />
      <Button className="bg-brand-primary text-white">Action</Button>
    </Container>
  </Body>
</Tailwind>
```

### Maintaining Consistency

- **Always use the brand config** - Never hardcode colors in individual templates
- **Update config, not templates** - When colors change, update `tailwind.config.ts` only
- **Use semantic names** - `bg-brand-primary` not `bg-[#007bff]`
- **Ensure contrast** - Test that text is readable against backgrounds (WCAG AA: 4.5:1 ratio)

## Asset Locations

Direct users to place brand assets in appropriate locations:

- **Logo and images**: Host on a CDN or public URL. For local development, place in `emails/static/`.
- **Custom fonts**: Use the `Font` component with a web font URL (Google Fonts, Adobe Fonts, or self-hosted).

**Example prompt for gathering brand info:**
> "Before I create your email template, I need some brand information to ensure consistency. Could you provide:
> 1. Your primary brand color (hex code, e.g., #007bff)
> 2. Your logo URL (must be a publicly accessible PNG or JPEG)
> 3. Any secondary colors you'd like to use
> 4. Style preference (modern/minimal or classic/traditional)"

## Best Practices

1. **Make templates unique** - Not generic, tailored to user's request
2. **Test across clients** - Gmail, Outlook, Apple Mail, Yahoo Mail
3. **Keep file size under 102KB** - Gmail clips larger emails
4. **Use keywords strategically** - Increase engagement in email body
5. **Inline styles as fallback** - Some clients strip `<style>` tags

