import { apiHostnameManager } from '@/utils/api-hostname-manager';

const DEFAULT_API_URL = 'https://api.novu.co';
const DEFAULT_SOCKET_URL = 'https://ws.novu.co';

/**
 * `backendUrl` and `socketUrl` props for the dashboard's own servers. The SDK defaults to Novu's US servers,
 * so EU and self-hosted apps need them; same rule as the welcome guide.
 */
function getServerProps(): string {
  // Both follow the selected region, like the dashboard's own requests.
  const apiHostname = apiHostnameManager.getApiHostname();
  const socketHostname = apiHostnameManager.getWebSocketHostname();
  const props = [
    apiHostname !== DEFAULT_API_URL ? `backendUrl="${apiHostname}"` : '',
    socketHostname !== DEFAULT_SOCKET_URL ? `socketUrl="${socketHostname.replace(/^https:\/\//, 'wss://')}"` : '',
  ].filter(Boolean);

  return props.map((prop) => ` ${prop}`).join('');
}

/** Prompt for a coding agent: install Novu and add `<Inbox />` to whatever app it is run in. */
export function buildInboxSetupPrompt(
  applicationIdentifier: string,
  { requiresHmac = false }: { requiresHmac?: boolean } = {}
): string {
  const serverProps = getServerProps();
  const hashProp = requiresHmac ? ' subscriberHash="SUBSCRIBER_HASH"' : '';
  const hmacSection = requiresHmac
    ? `

## Subscriber hash

This environment requires HMAC. On the server, compute \`subscriberHash\` as the hex HMAC-SHA256 of the subscriber id, keyed with the Novu secret key read from an environment variable (\`NOVU_SECRET_KEY\`), and pass it to the client. Never put the secret key in browser code. Docs: https://docs.novu.co/platform/inbox/prepare-for-production`
    : '';

  return `# Add the Novu Inbox to this app

Detect the app's framework and add the Novu \`<Inbox />\` component to its header, navbar or sidebar.

Docs: https://docs.novu.co/platform/inbox/overview

## Install

Use the package for the framework (\`@novu/nextjs\`, \`@novu/react\`, \`@novu/react-native\` or \`@novu/js\`) and install it with the project's package manager.

## Component

\`\`\`tsx
<Inbox applicationIdentifier="${applicationIdentifier}" subscriber="SUBSCRIBER_ID"${hashProp}${serverProps} />
\`\`\`

## Subscriber ID

Use the app's existing auth (Clerk, NextAuth, Firebase, Supabase or custom) to pass the signed-in user's unique id as \`subscriber\`.${hmacSection}

## Rules

- Place <Inbox /> inline in existing UI. No new pages or wrapper components.
- Match the host app's styles through the \`appearance\` prop, using only values from its design system.
- Keep any \`backendUrl\` and \`socketUrl\` props shown above; they point the Inbox at this Novu server.
- Use TypeScript and follow the framework's conventions. No comments, empty props or unused imports.`;
}
