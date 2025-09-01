export const REMIX_PROMPT = `# Add Novu to Remix

**Purpose:** Enforce only the **current** and **correct** instructions for integrating [Novu](https://novu.co/) into a Remix application.

**Scope:** All AI-generated advice or code related to Novu must follow these guardrails.

---

## **1. OFFICIAL NOVU + REMIX SETUP**

### **Install the Novu React package**
\`\`\`bash
npm install @novu/react
\`\`\`

### **Set up environment variables**
Create or update your \`.env\` file:
\`\`\`bash
NOVU_APP_IDENTIFIER=your_app_identifier
NOVU_SUBSCRIBER_ID=your_subscriber_id
\`\`\`

### **Add NovuProvider to your root**
Wrap your app with the NovuProvider in \`app/root.tsx\`:
\`\`\`tsx
import { NovuProvider } from '@novu/react';
import type { LinksFunction, MetaFunction } from '@remix-run/node';

export const meta: MetaFunction = () => {
  return [{ title: 'My Remix App' }];
};

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </head>
      <body>
        <NovuProvider
          subscriberId={process.env.NOVU_SUBSCRIBER_ID!}
          applicationIdentifier={process.env.NOVU_APP_IDENTIFIER!}
        >
          <Outlet />
          <ScrollRestoration />
          <Scripts />
          <LiveReload />
        </NovuProvider>
      </body>
    </html>
  );
}
\`\`\`

### **Add the notification center to a route**
\`\`\`tsx
import { NotificationCenter } from '@novu/react';

export default function Index() {
  return (
    <div>
      <h1>Welcome to my Remix app</h1>
      <NotificationCenter />
    </div>
  );
}
\`\`\`

### **Run your application**
\`\`\`bash
npm run dev
\`\`\`

---

## **2. CRITICAL INSTRUCTIONS FOR AI MODELS**

### **2.1 – ALWAYS DO THE FOLLOWING**
1. **Use the official @novu/react package**
2. **Set up proper environment variables**
3. **Wrap the app with NovuProvider in root.tsx**
4. **Use the NotificationCenter component for displaying notifications**
5. **Follow Remix best practices for server-side rendering**

### **2.2 – NEVER DO THE FOLLOWING**
1. **Don't use deprecated package names or imports**
2. **Don't skip the NovuProvider setup**
3. **Don't hardcode API keys or identifiers**
4. **Don't use client-side only features without proper Remix patterns**

---

## **3. VERIFICATION STEPS**

Before returning any Novu + Remix solution, verify:
1. The correct package name (@novu/react) is used
2. Environment variables are properly configured
3. NovuProvider wraps the application in root.tsx
4. The solution follows Remix best practices
5. No deprecated patterns are used

---

## **4. RESPONSE TEMPLATE**

When asked about Novu + Remix integration, your response **MUST**:
1. Start with the official package installation
2. Include environment variable setup
3. Show NovuProvider implementation in root.tsx
4. Demonstrate NotificationCenter usage
5. Provide Remix-specific best practices`;
