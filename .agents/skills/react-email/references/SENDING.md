Below are general guidelines for sending emails with React Email.

Important: Use verified domains in `from` addresses. Ask the user for the verified domain and use it in the `from` address. If the user does not have a verified domain, ask them to verify one with their email service provider.

### Send with Resend (Recommended)

When you have access to the Resend MCP tool:

```typescript
import { render } from '@react-email/components';
import { WelcomeEmail } from './emails/welcome';

// Render to HTML
const html = await render(
  <WelcomeEmail name="John" verificationUrl="https://example.com/verify" />
);

// Create plain text version
const text = await render(<WelcomeEmail name="John" verificationUrl="https://example.com/verify" />, { plainText: true });

// Use Resend MCP send-email tool with:
// - to: recipient@example.com
// - subject: Welcome to Acme
// - html: html
// - text: text
```

If no MCP tool is available, you can use the Resend SDK for Node.js to send the email, which can accept React components directly:

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

### Send as a Template to Resend

If preferred, you can upload the email as a template to Resend, which can be used to send emails with the Resend SDK for Node.js:

```bash
npx react-email@latest resend setup
```

This will require the user to provide a Resend API key in the terminal.

Once configured, the user can select a template to send using the UI in the "Resend" tab using the "Upload" button or the "Bulk Upload" button to upload multiple emails at once.

If using a template when sending with the Resend SDK for Node.js, the user can pass the template ID to the `send` method:

```tsx
await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['user@example.com'],
  subject: 'Welcome to Acme',
  template: {
    id: '1245-1256-1234-1234',
  }
});
```

### Send with Other Providers

**Nodemailer:**

```tsx
import { render } from '@react-email/components';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

const html = await render(<WelcomeEmail name="John" verificationUrl="https://example.com/verify" />);

await transporter.sendMail({
  from: 'noreply@example.com',
  to: 'user@example.com',
  subject: 'Welcome',
  html
});
```

**SendGrid:**

```tsx
import { render } from '@react-email/components';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const html = await render(<WelcomeEmail name="John" verificationUrl="https://example.com/verify" />);

await sgMail.send({
  to: 'user@example.com',
  from: 'noreply@example.com',
  subject: 'Welcome',
  html
});
```