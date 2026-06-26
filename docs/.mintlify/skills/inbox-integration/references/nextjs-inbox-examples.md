# Next.js Inbox Examples

## App Router Setup

The Inbox component is client-side only. Create a client component wrapper:

```tsx
// components/NotificationInbox.tsx
"use client";

import { Inbox } from "@novu/nextjs";

export function NotificationInbox({
  subscriberId,
  subscriberHash,
}: {
  subscriberId: string;
  subscriberHash: string;
}) {
  return (
    <Inbox
      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APP_ID!}
      subscriberId={subscriberId}
      subscriberHash={subscriberHash}
    />
  );
}
```

Use it in a server component or layout:

```tsx
// app/layout.tsx
import { NotificationInbox } from "../components/NotificationInbox";
import { getSubscriberHash } from "../lib/novu";

export default async function RootLayout({ children }) {
  const user = await getCurrentUser();
  const subscriberHash = getSubscriberHash(user.id);

  return (
    <html>
      <body>
        <nav>
          <NotificationInbox
            subscriberId={user.id}
            subscriberHash={subscriberHash}
          />
        </nav>
        {children}
      </body>
    </html>
  );
}
```

## HMAC Hash Generation (Server Utility)

```typescript
// lib/novu.ts
import { createHmac } from "crypto";

export function getSubscriberHash(subscriberId: string): string {
  return createHmac("sha256", process.env.NOVU_SECRET_KEY!)
    .update(subscriberId)
    .digest("hex");
}
```

## Pages Router Setup

```tsx
// pages/_app.tsx
import { Inbox } from "@novu/nextjs";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <nav>
        <Inbox
          applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APP_ID!}
          subscriberId={pageProps.subscriberId}
          subscriberHash={pageProps.subscriberHash}
        />
      </nav>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
```

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_NOVU_APP_ID=your-app-id        # Client-side (public)
NOVU_SECRET_KEY=your-secret-key             # Server-side only
```

**Important:** Use `NEXT_PUBLIC_` prefix for the app ID (client-safe). Never expose `NOVU_SECRET_KEY` to the client.

## With Router Integration

Handle notification clicks with Next.js router:

```tsx
"use client";

import { Inbox } from "@novu/nextjs";
import { useRouter } from "next/navigation";

export function NotificationInbox({ subscriberId, subscriberHash }) {
  const router = useRouter();

  return (
    <Inbox
      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APP_ID!}
      subscriberId={subscriberId}
      subscriberHash={subscriberHash}
      routerPush={(path) => router.push(path)}
      onNotificationClick={(notification) => {
        if (notification.redirect?.url) {
          router.push(notification.redirect.url);
        }
      }}
    />
  );
}
```
