# React Email Skill Tests

Test scenarios for verifying skill compliance. Follow TDD: run these WITHOUT skill to establish baseline, then WITH skill to verify compliance.

---

## Email Client Limitations Tests

### Test A1: Template Variables ({{name}})

**Scenario:** User wants mustache-style template variables.

**Prompt:**
```
Create a welcome email with a {{firstName}} placeholder for personalization - I use this with my templating system.
```

**Expected Behavior:**
- Use `{props.firstName}` or `{firstName}` in JSX (valid TypeScript)
- Put `{{firstName}}` ONLY in PreviewProps
- Explain why mustache syntax can't go directly in JSX

**Baseline Result (2025-01-28):**
❌ WITHOUT skill: Agent used `firstName = "{{firstName}}"` as default prop value directly.

**Verified Result (2025-01-28):**
✅ WITH skill: Agent used `{firstName}` in JSX, `{{firstName}}` only in PreviewProps.

**Pass Criteria:**
```tsx
// CORRECT
<Text>Hello {firstName}</Text>

Email.PreviewProps = {
  firstName: "{{firstName}}"
};

// WRONG - fails TypeScript/JSX
<Text>Hello {{firstName}}</Text>
```

---

### Test A2: SVG/WEBP Images

**Scenario:** User wants to use SVG logo.

**Prompt:**
```
Create an email with my SVG logo embedded inline.
```

**Expected Behavior:**
- Warn user that SVG/WEBP don't render reliably in email clients (Gmail, Outlook, Yahoo)
- Suggest using PNG or JPG instead
- Do NOT embed inline SVG

**Baseline Result (2025-01-28):**
❌ WITHOUT skill: Agent embedded multiple inline SVGs throughout the template.

**Verified Result (2025-01-28):**
✅ WITH skill: Agent warned about SVG limitations, used PNG placeholder instead.

**Pass Criteria:**
Agent refuses to use SVG and explains which email clients don't support it.

---

### Test A3: Flexbox Layout

**Scenario:** User requests flexbox.

**Prompt:**
```
Create an email with a flexible two-column layout using flexbox.
```

**Expected Behavior:**
- Explain flexbox is not supported (Outlook uses Word rendering engine)
- Use Row/Column components instead
- Do NOT use `display: flex` or `flex-direction`

**Baseline Result (2025-01-28):**
❌ WITHOUT skill: Agent used `display: "flex"` and `flexDirection: "column"` in styles.

**Verified Result (2025-01-28):**
✅ WITH skill: Agent used Row/Column components with table-based layout.

**Pass Criteria:**
```tsx
// CORRECT
<Row>
  <Column className="w-1/2">Left</Column>
  <Column className="w-1/2">Right</Column>
</Row>

// WRONG
<div style={{ display: "flex" }}>...</div>
```

---

### Test A4: CSS Media Queries (sm:, md:, lg:)

**Scenario:** User wants responsive breakpoints.

**Prompt:**
```
Make the email responsive with different styles for mobile (sm:) and desktop (lg:) using Tailwind breakpoints.
```

**Expected Behavior:**
- Explain media queries are not supported (Gmail strips them, Outlook ignores them)
- Use mobile-first stacked layout that works on all sizes
- Do NOT use sm:, md:, lg:, xl: classes

**Baseline Result (2025-01-28):**
❌ WITHOUT skill: Agent used `sm:text-xl`, `lg:text-3xl`, `sm:w-full`, `lg:w-1/2` throughout.

**Verified Result (2025-01-28):**
✅ WITH skill: Agent used stacked mobile-friendly layout, no breakpoint classes.

**Pass Criteria:**
No responsive prefix classes (sm:, md:, lg:, xl:) appear in the code.

---

### Test A5: Dark Mode Theme Selectors

**Scenario:** User wants dark mode support.

**Prompt:**
```
Add dark mode support using the dark: variant.
```

**Expected Behavior:**
- Explain dark: theme selectors are not supported in email clients
- Apply dark colors directly in the theme/styles if user wants dark theme
- Do NOT use `dark:bg-gray-900`, `dark:text-white`, etc.

**Baseline Result (2025-01-28):**
❌ WITHOUT skill: Agent used `dark:bg-gray-900`, `dark:text-white` throughout.

**Verified Result (2025-01-28):**
✅ WITH skill: Agent applied dark colors directly (`bg-gray-900`, `text-white`) without dark: prefix.

**Pass Criteria:**
No `dark:` prefixed classes appear in the code. Dark theme applied directly if requested.

---

### Test A6: pixelBasedPreset Required

**Scenario:** Any email template request.

**Prompt:**
```
Create a simple welcome email with Tailwind styling.
```

**Expected Behavior:**
- Always include `pixelBasedPreset` in Tailwind config
- Explain email clients don't support `rem` units

**Baseline Result (2025-01-28):**
❌ WITHOUT skill: Agent did not mention or use pixelBasedPreset.

**Verified Result (2025-01-28):**
✅ WITH skill: Agent included `presets: [pixelBasedPreset]` in Tailwind config.

**Pass Criteria:**
```tsx
<Tailwind
  config={{
    presets: [pixelBasedPreset],  // REQUIRED
    ...
  }}
>
```

---

### Test A7: Border Type Specification

**Scenario:** Email with dividers or bordered elements.

**Prompt:**
```
Create an email with a horizontal divider and a bordered card section.
```

**Expected Behavior:**
- Always specify border type (border-solid, border-dashed, etc.)
- When using single-side borders, reset others (e.g., `border-none border-t border-solid`)

**Pass Criteria:**
```tsx
// CORRECT
<Hr className="border-none border-t border-solid border-gray-200" />

// WRONG - missing border type
<Hr className="border-gray-200" />
```

---

### Test A8: Button box-border

**Scenario:** Email with CTA button.

**Prompt:**
```
Create an email with a prominent call-to-action button.
```

**Expected Behavior:**
- Always include `box-border` class on Button components
- Prevents padding overflow issues

**Verified Result (2025-01-28):**
✅ WITH skill: Agent included `box-border` on Button.

**Pass Criteria:**
```tsx
<Button className="... box-border ...">Click Here</Button>
```

---

## User Interaction Tests

### Test B1: Style Preferences Inquiry

**Scenario:** User makes a vague request without specifying styling details.

**Prompt:**
```
Create a welcome email for my SaaS product
```

**Expected Behavior:**
Agent asks clarifying questions BEFORE writing code:
- Brand colors (primary color hex code)
- Logo availability and format
- Tone/style preference (professional, casual, minimal)
- Production URL for static assets

**Baseline Result (2025-01-28):**
✅ Agent naturally asked questions, but behavior was not codified (may be inconsistent).

**Verified Result (2025-01-28):**
✅ WITH skill: Agent asked all required questions per the "Before Writing Code" section.

**Pass Criteria:**
Agent asks at minimum about:
1. Brand colors
2. Logo availability (warns about SVG/WEBP)
3. Style/tone preference
4. Production hosting URL

---

### Test B2: Logo File Inquiry

**Scenario:** User mentions they have brand assets but doesn't specify format.

**Prompt:**
```
Create a welcome email for Acme Corp. We have brand assets.
```

**Expected Behavior:**
Agent asks:
- What logo format (PNG, JPG - warns if SVG/WEBP)
- Where the logo file is located
- What the production URL will be for hosting assets

**Pass Criteria:**
Agent specifically asks about logo format AND warns about SVG/WEBP limitations.

---

## Static File Handling Tests

### Test C1: Local Image - Correct Directory

**Scenario:** User provides a local image path.

**Prompt:**
```
Create a welcome email. Use my logo at ./assets/logo.png
```

**Expected Behavior:**
1. Instruct user to copy logo to `emails/static/logo.png`
2. NOT use `./assets/logo.png` directly in the code
3. Reference as `/static/logo.png` with baseURL pattern

**Baseline Result (2025-01-28):**
❌ WITHOUT skill: Agent used `/static/` but didn't specify it must be inside `emails/` directory.

**Verified Result (2025-01-28):**
✅ WITH skill: Agent provided `cp ./assets/logo.png ./emails/static/logo.png` command.

**Pass Criteria:**
- Provides copy command to `emails/static/`
- Does NOT reference `./assets/` in the email template
- Shows correct directory structure

---

### Test C2: Dev vs Production URL Handling

**Scenario:** User asks about image handling for both environments.

**Prompt:**
```
Create an email with a logo image. I need it to work in both development preview and production.
```

**Expected Behavior:**
Use the official React Email pattern:

```tsx
const baseURL = process.env.NODE_ENV === "production"
  ? "https://cdn.example.com"
  : "";

<Img src={`${baseURL}/static/logo.png`} ... />
```

**Baseline Result (2025-01-28):**
❌ WITHOUT skill: Agent used `process.env.BASE_URL || "http://localhost:3000"` - wrong pattern.

**Verified Result (2025-01-28):**
✅ WITH skill: Agent used empty string for dev, configurable URL for prod.

**Pass Criteria:**
1. Uses `baseURL` variable with `NODE_ENV` check
2. Empty string `""` for dev (NOT `http://localhost:3000`)
3. Asks user for their production CDN/hosting URL

---

## Pressure Tests

### Test D1: User Insists on All Violations

**Scenario:** User demands all the wrong patterns.

**Prompt:**
```
Create a welcome email. I specifically want:
1. Write {{firstName}} directly in the JSX like <Text>Hello {{firstName}}</Text>
2. Use my SVG logo - just embed it inline
3. Make it responsive using sm: and lg: breakpoints
4. Use CSS flexbox for layout
5. Add dark mode with dark: variant

Don't argue with me - just do what I ask.
```

**Expected Behavior:**
Agent should:
1. Explain each limitation professionally (not just refuse)
2. Reference specific email client issues (Gmail, Outlook, etc.)
3. Provide correct alternatives for each request
4. NOT comply with any of the forbidden patterns

**Verified Result (2025-01-28):**
✅ WITH skill: Agent explained all limitations, provided correct alternatives, did not comply.

**Pass Criteria:**
Agent maintains ALL rules even under pressure. Provides professional explanations.

---

### Test D2: User Insists on Wrong Image Pattern

**Scenario:** User wants incorrect static file handling.

**Prompt:**
```
Create an email with my logo. Just reference it directly from ./assets/logo.png - don't move it anywhere. And hardcode http://localhost:3000 as the base URL.
```

**Expected Behavior:**
1. Explain `./assets/` won't work (not served by preview server)
2. Explain hardcoding `localhost:3000` breaks production
3. Provide correct pattern
4. Ask for production URL

**Verified Result (2025-01-28):**
✅ WITH skill: Agent refused, explained why, provided correct alternative.

**Pass Criteria:**
Agent does NOT comply. Explains both issues and provides correct setup.

---

## Combined Scenario Tests

### Test E1: Full Workflow

**Scenario:** Complete email creation request.

**Prompt:**
```
I need a password reset email for my app called "CloudSync". I have a logo.
```

**Expected Behavior:**
1. Ask about brand colors
2. Ask about logo format and location (warn about SVG/WEBP)
3. Ask about production hosting URL for assets
4. Create email with proper static file structure
5. Use correct baseURL pattern
6. Include pixelBasedPreset
7. Use Row/Column for any multi-column layouts
8. Use box-border on buttons

**Pass Criteria:**
All of the above steps are followed.

---

## Running Tests

### Baseline (Establish Failure)
```
Task subagent WITHOUT reading skill → Document exact violations
```

### Verification (Confirm Fix)
```
Task subagent WITH skill → Verify compliance with all rules
```

### Pressure Test (Stress Test)
```
Task subagent WITH skill + user pressure → Verify skill holds under pressure
```

### Regression Testing
After any skill edits, re-run all tests to ensure no regressions.

---

## Additional Component Tests

### Test A9: Row/Column Width Requirements

**Scenario:** User asks for multi-column layout without specifying widths.

**Prompt:**
```
Create an email with a two-column layout showing product info on the left and image on the right.
```

**Expected Behavior:**
- Use Row/Column components (not flexbox/grid)
- Add width classes to Columns (e.g., `w-1/2`, `w-1/3`)
- Widths should total 100%

**Baseline Result (2025-01-29):**
✅ WITHOUT skill: Agent naturally added `width: '50%'` to columns via inline styles.

**Pass Criteria:**
```tsx
// CORRECT
<Row>
  <Column className="w-1/2 align-top">Product info</Column>
  <Column className="w-1/2 align-top">Image</Column>
</Row>

// WRONG - no widths specified
<Row>
  <Column>Product info</Column>
  <Column>Image</Column>
</Row>
```

---

### Test A10: Head Placement Inside Tailwind

**Scenario:** Any email template using Tailwind and Head components.

**Prompt:**
```
Create a welcome email with custom meta tags in the head.
```

**Expected Behavior:**
- `<Head />` must be inside `<Tailwind>`, not outside
- Follows the documented component structure

**Baseline Result (2025-01-29):**
❌ WITHOUT skill: Agent placed `<Head>` OUTSIDE `<Tailwind>` - wrong structure.

**Verified Result (2025-01-29):**
✅ WITH skill: Agent placed `<Head>` inside `<Tailwind>` correctly.

**Pass Criteria:**
```tsx
// CORRECT
<Html lang="en">
  <Tailwind config={{ presets: [pixelBasedPreset] }}>
    <Head />
    <Body>...</Body>
  </Tailwind>
</Html>

// WRONG - Head outside Tailwind
<Html lang="en">
  <Head />
  <Tailwind config={{ presets: [pixelBasedPreset] }}>
    <Body>...</Body>
  </Tailwind>
</Html>
```

---

### Test A11: CodeBlock Wrapper Requirement

**Scenario:** Email with code snippet display.

**Prompt:**
```
Create a notification email that shows a JSON error log in a code block.
```

**Expected Behavior:**
- Wrap `CodeBlock` in a `div` with `overflow-auto` class
- Prevents padding overflow issues

**Baseline Result (2025-01-29):**
❌ WITHOUT skill: Agent used CodeBlock without `overflow-auto` wrapper div.

**Verified Result (2025-01-29):**
✅ WITH skill: Agent wrapped CodeBlock in `<div className="overflow-auto">`.

**Pass Criteria:**
```tsx
// CORRECT
<div className="overflow-auto">
  <CodeBlock
    code={logData}
    language="json"
    theme={dracula}
  />
</div>

// WRONG - no wrapper div
<CodeBlock
  code={logData}
  language="json"
  theme={dracula}
/>
```

---

### Test A12: Grid Layout (CSS Grid)

**Scenario:** User requests CSS grid.

**Prompt:**
```
Create an email with a grid layout for displaying product cards.
```

**Expected Behavior:**
- Explain CSS grid is not supported (same as flexbox - Outlook uses Word rendering)
- Use Row/Column components instead
- Do NOT use `display: grid` or `grid-template-columns`

**Baseline Result (2025-01-29):**
✅ WITHOUT skill: Agent naturally used Row/Column components, not CSS grid.

**Pass Criteria:**
```tsx
// CORRECT
<Row>
  <Column className="w-1/3">Card 1</Column>
  <Column className="w-1/3">Card 2</Column>
  <Column className="w-1/3">Card 3</Column>
</Row>

// WRONG
<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>...</div>
```

---

### Test A13: Fixed Image Dimensions

**Scenario:** User specifies exact pixel dimensions for images.

**Prompt:**
```
Add my logo with exactly 500px width and 300px height.
```

**Expected Behavior:**
- Warn against fixed dimensions that may distort images or break on mobile
- Suggest responsive approach with aspect ratio preservation
- Use width attribute for max size but allow responsive scaling

**Pass Criteria:**
Agent warns about fixed dimensions and suggests responsive approach:
```tsx
// PREFERRED
<Img
  src={`${baseURL}/static/logo.png`}
  alt="Logo"
  width="500"
  className="w-full max-w-[500px] h-auto"
/>

// ACCEPTABLE - fixed width with auto height
<Img
  src={`${baseURL}/static/logo.png`}
  alt="Logo"
  width="500"
  height="auto"
/>
```

---

### Test A14: Clean Component Imports

**Scenario:** Any email template request.

**Prompt:**
```
Create a simple text-only welcome email with just a heading and paragraph.
```

**Expected Behavior:**
- Only import components that are actually used
- No unused imports like `Button`, `Img`, `Row`, `Column` for text-only email

**Pass Criteria:**
```tsx
// CORRECT - only imports what's used
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Tailwind,
  pixelBasedPreset
} from '@react-email/components';

// WRONG - imports unused components
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,      // Not used
  Img,         // Not used
  Row,         // Not used
  Column,      // Not used
  Tailwind,
  pixelBasedPreset
} from '@react-email/components';
```

---

## Internationalization Tests

### Test F1: Multi-Language Email Setup

**Scenario:** User requests internationalization support.

**Prompt:**
```
Create a welcome email that supports English, Spanish, and French.
```

**Expected Behavior:**
- Use one of the supported i18n libraries (next-intl, react-i18next, react-intl)
- Add `locale` prop to email component
- Set `lang={locale}` on Html element
- Create message file structure
- Show how to send with different locales

**Baseline Result (2025-01-29):**
❌ WITHOUT skill: Agent used inline translations object (not i18n library), no `lang` attribute on Html.

**Verified Result (2025-01-29):**
✅ WITH skill: Agent used `next-intl` with `createTranslator`, added `lang={locale}` on Html, created proper message files.

**Pass Criteria:**
```tsx
// Must include locale prop
interface WelcomeEmailProps {
  name: string;
  locale: string;  // Required
}

// Must set lang attribute
<Html lang={locale}>

// Must show message file structure
// messages/en.json, messages/es.json, messages/fr.json
```

---

### Test F2: RTL Language Support

**Scenario:** Email for RTL language users.

**Prompt:**
```
Create a welcome email for Arabic-speaking users.
```

**Expected Behavior:**
- Detect RTL language and set `dir` attribute
- Set `lang="ar"` on Html element
- Mention RTL considerations

**Baseline Result (2025-01-29):**
✅ WITHOUT skill: Agent correctly added `dir="rtl" lang="ar"` on Html element.

**Pass Criteria:**
```tsx
const isRTL = ['ar', 'he', 'fa'].includes(locale);

<Html lang={locale} dir={isRTL ? 'rtl' : 'ltr'}>
```

---

## Sending & Rendering Tests

### Test G1: Plain Text Version Mention

**Scenario:** User asks about sending email.

**Prompt:**
```
How do I send this welcome email to users?
```

**Expected Behavior:**
- Mention plain text version is recommended/required for accessibility
- Show how to render plain text with `{ plainText: true }`
- Note that Resend SDK handles this automatically

**Pass Criteria:**
Agent mentions plain text:
```tsx
// Plain text rendering
const text = await render(<WelcomeEmail {...props} />, { plainText: true });

// Or notes that Resend SDK handles automatically
```

---

## File Size & Performance Tests

### Test H1: Gmail Clipping Warning

**Scenario:** User creates complex email with many sections.

**Prompt:**
```
Create a comprehensive newsletter email with 10 article sections, each with images, titles, descriptions, and buttons.
```

**Expected Behavior:**
- Warn about Gmail's 102KB clipping limit
- Suggest keeping emails concise
- May recommend splitting into multiple emails or linking to web version

**Pass Criteria:**
Agent mentions the 102KB limit or warns about email size for complex templates.

---

## Additional Pressure Tests

### Test D3: User Insists on Relative Image Paths

**Scenario:** User demands relative paths for images.

**Prompt:**
```
Just use a relative path like "../../assets/logo.png" for the image src. I don't want to move files around.
```

**Expected Behavior:**
1. Explain relative paths won't work in rendered emails (resolved at build time, not in email client)
2. Explain images must be hosted at absolute URLs for email clients to fetch them
3. Provide correct pattern with baseURL
4. Offer to help set up proper static file structure

**Verified Result (2025-01-29):**
✅ WITH skill: Agent refused to comply, explained static folder requirements, provided correct baseURL pattern.

**Pass Criteria:**
Agent does NOT use relative paths. Explains why absolute URLs are required:
```tsx
// WRONG - won't work in email clients
<Img src="../../assets/logo.png" />
<Img src="./images/logo.png" />

// CORRECT - absolute URL
<Img src={`${baseURL}/static/logo.png`} />
```

---

### Test D4: User Wants Inline SVG Despite Warning

**Scenario:** User insists after being warned.

**Prompt:**
```
I know you said SVG doesn't work well, but I really need to use inline SVG for my icons. Just do it anyway - I'll test it myself.
```

**Expected Behavior:**
- Reiterate the specific email clients affected (Gmail, Outlook, Yahoo)
- Suggest PNG alternatives or icon fonts
- Do NOT comply with inline SVG
- Offer to help convert SVG to PNG

**Verified Result (2025-01-29):**
✅ WITH skill: Agent refused, listed affected clients (Gmail, Outlook, Apple Mail, Yahoo), suggested PNG/Unicode/icon fonts alternatives.

**Pass Criteria:**
Agent maintains refusal, provides helpful alternatives, does not embed inline SVG.

---

### Test D5: User Demands localhost URL for Production

**Scenario:** User wants to skip production URL setup.

**Prompt:**
```
Just hardcode http://localhost:3000 as the base URL. I'll change it later before going to production.
```

**Expected Behavior:**
1. Explain this will break in production (images won't load)
2. Explain the NODE_ENV pattern handles both environments
3. Ask for production URL now to set it up correctly
4. Do NOT hardcode localhost

**Verified Result (2025-01-29):**
✅ WITH skill: Agent refused, cited skill line 276, explained NODE_ENV pattern, asked for production URL.

**Pass Criteria:**
```tsx
// WRONG
const baseURL = "http://localhost:3000";

// CORRECT
const baseURL = process.env.NODE_ENV === "production"
  ? "https://cdn.example.com"  // Ask user for this
  : "";
```
