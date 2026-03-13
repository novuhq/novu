# Common Email Patterns

Real-world examples of common email templates using React Email with Tailwind CSS styling.

## Password Reset Email

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
  Hr,
  Tailwind,
  pixelBasedPreset
} from '@react-email/components';

interface PasswordResetProps {
  resetUrl: string;
  email: string;
  expiryHours?: number;
}

export default function PasswordReset({ resetUrl, email, expiryHours = 1 }: PasswordResetProps) {
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Preview>Reset your password - Action required</Preview>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto py-10 px-5 max-w-xl bg-white">
            <Heading className="text-2xl font-bold text-gray-800 mb-5">
              Reset Your Password
            </Heading>
            <Text className="text-base leading-7 text-gray-800 my-4">
              A password reset was requested for your account: <strong>{email}</strong>
            </Text>
            <Text className="text-base leading-7 text-gray-800 my-4">
              Click the button below to reset your password. This link expires in {expiryHours} hour{expiryHours > 1 ? 's' : ''}.
            </Text>
            <Button
              href={resetUrl}
              className="bg-red-600 text-white px-7 py-3.5 rounded block text-center font-bold my-6 no-underline"
            >
              Reset Password
            </Button>
            <Hr className="border-gray-200 my-6" />
            <Text className="text-sm text-gray-500 leading-5 my-2">
              If you didn't request this, please ignore this email. Your password will remain unchanged.
            </Text>
            <Text className="text-sm text-gray-500 leading-5 my-2">
              For security, this link will only work once.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

PasswordReset.PreviewProps = {
  resetUrl: 'https://example.com/reset/abc123',
  email: 'user@example.com',
  expiryHours: 1
} as PasswordResetProps;
```

## Order Confirmation with Product List

```tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Row,
  Column,
  Heading,
  Text,
  Img,
  Hr,
  Tailwind,
  pixelBasedPreset
} from '@react-email/components';

interface Product {
  name: string;
  price: number;
  quantity: number;
  image: string;
  sku?: string;
}

interface OrderConfirmationProps {
  orderNumber: string;
  orderDate: Date;
  items: Product[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export default function OrderConfirmation({
  orderNumber,
  orderDate,
  items,
  subtotal,
  shipping,
  tax,
  total,
  shippingAddress
}: OrderConfirmationProps) {
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Preview>Order #{orderNumber} confirmed - Thank you for your purchase!</Preview>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto py-10 px-5 max-w-xl">
            <Heading className="text-3xl font-bold text-gray-800 mb-2">
              Order Confirmed
            </Heading>
            <Text className="text-base text-gray-500 mb-6">Thank you for your order!</Text>

            <Section className="bg-gray-50 p-4 rounded mb-6">
              <Row>
                <Column>
                  <Text className="text-xs text-gray-500 uppercase mb-1">Order Number</Text>
                  <Text className="text-base font-bold text-gray-800 m-0">#{orderNumber}</Text>
                </Column>
                <Column>
                  <Text className="text-xs text-gray-500 uppercase mb-1">Order Date</Text>
                  <Text className="text-base font-bold text-gray-800 m-0">{orderDate.toLocaleDateString()}</Text>
                </Column>
              </Row>
            </Section>

            <Hr className="border-gray-200 my-6" />

            <Heading as="h2" className="text-xl font-bold text-gray-800 my-4">
              Order Items
            </Heading>

            {items.map((item, index) => (
              <Section key={index} className="mb-4">
                <Row>
                  <Column className="w-20 align-top">
                    <Img
                      src={item.image}
                      alt={item.name}
                      width="80"
                      height="80"
                      className="rounded border border-gray-200"
                    />
                  </Column>
                  <Column className="align-top pl-4">
                    <Text className="text-base font-bold text-gray-800 m-0 mb-1">{item.name}</Text>
                    {item.sku && <Text className="text-sm text-gray-400 m-0 mb-2">SKU: {item.sku}</Text>}
                    <Text className="text-sm text-gray-500 m-0">
                      Quantity: {item.quantity} × ${item.price.toFixed(2)}
                    </Text>
                  </Column>
                  <Column className="w-24 text-right align-top">
                    <Text className="text-base font-bold text-gray-800 m-0">
                      ${(item.quantity * item.price).toFixed(2)}
                    </Text>
                  </Column>
                </Row>
              </Section>
            ))}

            <Hr className="border-gray-200 my-6" />

            <Section className="mt-6">
              <Row>
                <Column><Text className="text-sm text-gray-500 my-2">Subtotal</Text></Column>
                <Column className="text-right">
                  <Text className="text-sm text-gray-800 my-2">${subtotal.toFixed(2)}</Text>
                </Column>
              </Row>
              <Row>
                <Column><Text className="text-sm text-gray-500 my-2">Shipping</Text></Column>
                <Column className="text-right">
                  <Text className="text-sm text-gray-800 my-2">${shipping.toFixed(2)}</Text>
                </Column>
              </Row>
              <Row>
                <Column><Text className="text-sm text-gray-500 my-2">Tax</Text></Column>
                <Column className="text-right">
                  <Text className="text-sm text-gray-800 my-2">${tax.toFixed(2)}</Text>
                </Column>
              </Row>
              <Hr className="border-gray-200 my-3" />
              <Row>
                <Column><Text className="text-lg font-bold text-gray-800 my-2">Total</Text></Column>
                <Column className="text-right">
                  <Text className="text-lg font-bold text-gray-800 my-2">${total.toFixed(2)}</Text>
                </Column>
              </Row>
            </Section>

            <Hr className="border-gray-200 my-6" />

            <Heading as="h2" className="text-xl font-bold text-gray-800 my-4">
              Shipping Address
            </Heading>
            <Section className="bg-gray-50 p-4 rounded">
              <Text className="text-sm text-gray-800 my-1">{shippingAddress.name}</Text>
              <Text className="text-sm text-gray-800 my-1">{shippingAddress.street}</Text>
              <Text className="text-sm text-gray-800 my-1">
                {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}
              </Text>
              <Text className="text-sm text-gray-800 my-1">{shippingAddress.country}</Text>
            </Section>

            <Text className="text-sm text-gray-500 mt-8">
              Questions about your order? Reply to this email and we'll help you out.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

OrderConfirmation.PreviewProps = {
  orderNumber: '10234',
  orderDate: new Date(),
  items: [
    {
      name: 'Vintage Macintosh',
      price: 499.00,
      quantity: 1,
      image: 'https://via.placeholder.com/80',
      sku: 'MAC-001'
    },
    {
      name: 'Mechanical Keyboard',
      price: 149.99,
      quantity: 2,
      image: 'https://via.placeholder.com/80',
      sku: 'KEY-042'
    }
  ],
  subtotal: 798.98,
  shipping: 15.00,
  tax: 69.42,
  total: 883.40,
  shippingAddress: {
    name: 'John Doe',
    street: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    country: 'USA'
  }
} as OrderConfirmationProps;
```

## Notification Email with Code Block

```tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  CodeBlock,
  dracula,
  Hr,
  Link,
  Tailwind,
  pixelBasedPreset
} from '@react-email/components';

interface NotificationProps {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  logData?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export default function Notification({
  title,
  message,
  severity,
  timestamp,
  logData,
  actionUrl,
  actionLabel = 'View Details'
}: NotificationProps) {
  const severityColors = {
    info: 'bg-sky-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    success: 'bg-green-500'
  };

  const severityBtnColors = {
    info: 'bg-sky-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    success: 'bg-green-500'
  };

  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Preview>{title} - {severity}</Preview>
        <Body className="bg-gray-100 font-mono">
          <Container className="mx-auto max-w-xl bg-white border border-gray-200 rounded overflow-hidden">
            <Section className={`h-1 w-full ${severityColors[severity]}`} />

            <Heading className="text-2xl font-bold text-gray-800 mx-6 mt-6 mb-4">
              {title}
            </Heading>

            <Text className={`inline-block px-3 py-1 text-xs font-bold text-white rounded-full mx-6 mb-4 ${severityBtnColors[severity]}`}>
              {severity.toUpperCase()}
            </Text>

            <Text className="text-base leading-6 text-gray-800 mx-6 mb-4">
              {message}
            </Text>

            <Text className="text-sm text-gray-500 mx-6 mb-6">
              {new Date(timestamp).toLocaleString('en-US', {
                dateStyle: 'long',
                timeStyle: 'short'
              })}
            </Text>

            {logData && (
              <>
                <Hr className="border-gray-200 my-6" />
                <Heading as="h2" className="text-lg font-bold text-gray-800 mx-6 my-4">
                  Log Details
                </Heading>
                <Section className="mx-6">
                  <CodeBlock
                    code={logData}
                    language="json"
                    theme={dracula}
                    lineNumbers
                  />
                </Section>
              </>
            )}

            {actionUrl && (
              <>
                <Hr className="border-gray-200 my-6" />
                <Link
                  href={actionUrl}
                  className={`inline-block px-6 py-3 text-base font-bold text-white rounded no-underline mx-6 mb-6 ${severityBtnColors[severity]}`}
                >
                  {actionLabel}
                </Link>
              </>
            )}

            <Hr className="border-gray-200 my-6" />
            <Text className="text-xs text-gray-500 mx-6 mb-6">
              This is an automated notification. Please do not reply to this email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

Notification.PreviewProps = {
  title: 'Deployment Failed',
  message: 'The deployment to production environment has failed. Please review the logs and take corrective action.',
  severity: 'error',
  timestamp: new Date(),
  logData: `{
  "error": "Build failed",
  "exit_code": 1,
  "duration": "2m 34s",
  "commit": "abc123def"
}`,
  actionUrl: 'https://example.com/deployments/123',
  actionLabel: 'View Deployment'
} as NotificationProps;
```

## Multi-Column Newsletter

```tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Row,
  Column,
  Heading,
  Text,
  Img,
  Button,
  Hr,
  Link,
  Tailwind,
  pixelBasedPreset
} from '@react-email/components';

interface Article {
  title: string;
  excerpt: string;
  image: string;
  url: string;
  author: string;
  date: string;
}

interface NewsletterProps {
  articles: Article[];
  unsubscribeUrl: string;
}

export default function Newsletter({ articles, unsubscribeUrl }: NewsletterProps) {
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Preview>Your weekly roundup of the latest articles</Preview>
        <Body className="bg-white font-sans">
          <Container className="mx-auto max-w-xl">
            {/* Header */}
            <Section className="pt-10 px-5 pb-5 text-center">
              <Img
                src="https://via.placeholder.com/150x50?text=Logo"
                alt="Company Logo"
                width="150"
                height="50"
              />
            </Section>

            <Heading className="text-3xl font-bold text-gray-900 mx-5 mb-4 text-center">
              This Week's Highlights
            </Heading>
            <Text className="text-base leading-6 text-gray-500 mx-5 mb-6 text-center">
              Here are the top articles from this week. Enjoy your reading!
            </Text>

            <Hr className="border-gray-200 mx-5 my-8" />

            {/* Featured Article */}
            {articles[0] && (
              <Section className="px-5">
                <Img
                  src={articles[0].image}
                  alt={articles[0].title}
                  width="600"
                  className="w-full rounded-lg mb-4"
                />
                <Heading as="h2" className="text-2xl font-bold text-gray-900 my-4">
                  {articles[0].title}
                </Heading>
                <Text className="text-base leading-6 text-gray-500 my-4">
                  {articles[0].excerpt}
                </Text>
                <Text className="text-sm text-gray-400 my-2">
                  By {articles[0].author} • {articles[0].date}
                </Text>
                <Button
                  href={articles[0].url}
                  className="bg-blue-600 text-white px-6 py-3 rounded font-bold inline-block no-underline"
                >
                  Read More
                </Button>
              </Section>
            )}

            <Hr className="border-gray-200 mx-5 my-8" />

            {/* Two-Column Articles */}
            {articles.slice(1, 5).length > 0 && (
              <>
                <Heading as="h2" className="text-2xl font-bold text-gray-900 mx-5 my-4">
                  More From This Week
                </Heading>
                {Array.from({ length: Math.ceil(articles.slice(1, 5).length / 2) }).map((_, rowIndex) => {
                  const leftArticle = articles[1 + rowIndex * 2];
                  const rightArticle = articles[2 + rowIndex * 2];

                  return (
                    <Section key={rowIndex} className="px-5 mb-6">
                      <Row>
                        {leftArticle && (
                          <Column className="w-1/2 align-top px-1">
                            <Img
                              src={leftArticle.image}
                              alt={leftArticle.title}
                              width="280"
                              className="w-full rounded mb-3"
                            />
                            <Heading as="h3" className="text-lg font-bold text-gray-900 my-3">
                              {leftArticle.title}
                            </Heading>
                            <Text className="text-sm leading-5 text-gray-500 my-2">
                              {leftArticle.excerpt}
                            </Text>
                            <Link href={leftArticle.url} className="text-sm text-blue-600 no-underline font-semibold">
                              Read article →
                            </Link>
                          </Column>
                        )}

                        {rightArticle && (
                          <Column className="w-1/2 align-top px-1">
                            <Img
                              src={rightArticle.image}
                              alt={rightArticle.title}
                              width="280"
                              className="w-full rounded mb-3"
                            />
                            <Heading as="h3" className="text-lg font-bold text-gray-900 my-3">
                              {rightArticle.title}
                            </Heading>
                            <Text className="text-sm leading-5 text-gray-500 my-2">
                              {rightArticle.excerpt}
                            </Text>
                            <Link href={rightArticle.url} className="text-sm text-blue-600 no-underline font-semibold">
                              Read article →
                            </Link>
                          </Column>
                        )}
                      </Row>
                    </Section>
                  );
                })}
              </>
            )}

            <Hr className="border-gray-200 mx-5 my-8" />

            {/* Footer */}
            <Section className="bg-gray-50 p-8 mt-8 text-center">
              <Text className="text-sm text-gray-500 my-2">
                You're receiving this because you subscribed to our newsletter.
              </Text>
              <Link href={unsubscribeUrl} className="text-sm text-blue-600 underline block my-2">
                Unsubscribe from this list
              </Link>
              <Text className="text-sm text-gray-500 my-2">
                © 2026 Company Name. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

Newsletter.PreviewProps = {
  articles: [
    {
      title: 'The Future of Web Development in 2026',
      excerpt: 'Exploring the latest trends and technologies shaping modern web development.',
      image: 'https://via.placeholder.com/600x300',
      url: 'https://example.com/article-1',
      author: 'Jane Doe',
      date: 'Jan 15, 2026'
    },
    {
      title: 'React Server Components Explained',
      excerpt: 'A deep dive into React Server Components and their benefits.',
      image: 'https://via.placeholder.com/280x140',
      url: 'https://example.com/article-2',
      author: 'John Smith',
      date: 'Jan 14, 2026'
    },
    {
      title: 'Building Accessible Web Apps',
      excerpt: 'Best practices for creating inclusive digital experiences.',
      image: 'https://via.placeholder.com/280x140',
      url: 'https://example.com/article-3',
      author: 'Sarah Johnson',
      date: 'Jan 13, 2026'
    }
  ],
  unsubscribeUrl: 'https://example.com/unsubscribe'
} as NewsletterProps;
```

## Team Invitation Email

```tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Tailwind,
  pixelBasedPreset
} from '@react-email/components';

interface TeamInvitationProps {
  inviterName: string;
  inviterEmail: string;
  teamName: string;
  role: string;
  inviteUrl: string;
  expiryDays: number;
}

export default function TeamInvitation({
  inviterName,
  inviterEmail,
  teamName,
  role,
  inviteUrl,
  expiryDays
}: TeamInvitationProps) {
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Preview>You've been invited to join {teamName}</Preview>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto py-10 px-5 max-w-xl bg-white">
            <Heading className="text-3xl font-bold text-gray-800 text-center mb-6">
              You're Invited!
            </Heading>

            <Text className="text-base leading-7 text-gray-800 my-4">
              <strong>{inviterName}</strong> ({inviterEmail}) has invited you to join the{' '}
              <strong>{teamName}</strong> team.
            </Text>

            <Section className="bg-gray-50 p-5 rounded border border-gray-200 my-6">
              <Text className="text-xs text-gray-500 uppercase font-bold mb-2">Role</Text>
              <Text className="text-lg font-bold text-gray-800 m-0">{role}</Text>
            </Section>

            <Text className="text-base leading-7 text-gray-800 my-4">
              Click the button below to accept the invitation and get started.
            </Text>

            <Button
              href={inviteUrl}
              className="bg-green-600 text-white px-7 py-3.5 rounded block text-center font-bold text-base my-6 no-underline"
            >
              Accept Invitation
            </Button>

            <Hr className="border-gray-200 my-6" />

            <Text className="text-sm text-gray-500 leading-5 my-2">
              This invitation will expire in {expiryDays} day{expiryDays > 1 ? 's' : ''}.
            </Text>
            <Text className="text-sm text-gray-500 leading-5 my-2">
              If you weren't expecting this invitation, you can safely ignore this email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

TeamInvitation.PreviewProps = {
  inviterName: 'John Doe',
  inviterEmail: 'john@example.com',
  teamName: 'Acme Corp Engineering',
  role: 'Developer',
  inviteUrl: 'https://example.com/invite/abc123',
  expiryDays: 7
} as TeamInvitationProps;
```

These patterns demonstrate:
- Tailwind CSS utility classes for styling
- Proper component usage with `pixelBasedPreset`
- TypeScript typing
- Preview props for testing
- Responsive layouts
- Common email scenarios
