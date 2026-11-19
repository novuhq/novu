/** Prompt for a coding agent: install Novu and add `<Inbox />` to whatever app it is run in. */
export function buildInboxSetupPrompt(applicationIdentifier: string): string {
  return `# Add the Novu Inbox to this app

Detect the app's framework and add the Novu \`<Inbox />\` component to its header, navbar or sidebar.

Docs: https://docs.novu.co/platform/inbox/overview

## Install

Use the package for the framework (\`@novu/nextjs\`, \`@novu/react\`, \`@novu/react-native\` or \`@novu/js\`) and install it with the project's package manager.

## Component

\`\`\`tsx
<Inbox applicationIdentifier="${applicationIdentifier}" subscriber="SUBSCRIBER_ID" />
\`\`\`

## Subscriber ID

Use the app's existing auth (Clerk, NextAuth, Firebase, Supabase or custom) to pass the signed-in user's unique id as \`subscriber\`.

## Rules

- Place <Inbox /> inline in existing UI. No new pages or wrapper components.
- Match the host app's styles through the \`appearance\` prop, using only values from its design system.
- Use TypeScript and follow the framework's conventions. No comments, empty props or unused imports.`;
}

/** Cursor deep link that opens the prompt in a new chat. */
export function buildCursorPromptLink(prompt: string): string {
  const encoded = encodeURIComponent(prompt).replace(
    /[!'()*~]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );

  return `https://cursor.com/link/prompt?text=${encoded}`;
}
