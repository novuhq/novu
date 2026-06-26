# Documentation project instructions

## About this project

- Novu is the open-source notification infrastructure for in-app (Inbox), email, SMS, push, and chat
- This is a documentation site built on [Mintlify](https://mintlify.com)
- Pages are MDX files with YAML frontmatter
- Configuration lives in `docs.json`
- Use the Mintlify MCP server, `https://mcp.mintlify.com`, to edit content and settings via MCP
- Use the Mintlify docs MCP server, `https://www.mintlify.com/docs/mcp`, to query information about using Mintlify via MCP

## Terminology

Use Novu-specific terms consistently. For full definitions, see the [glossary](/platform/additional-resources/glossary).

- Use **subscriber** (not "user") for notification recipients, identified by `subscriberId`
- Use **workflow** for the notification flow definition; **step** for individual nodes; **trigger** for invocation
- Use **channel** for delivery mediums: in-app/Inbox, email, SMS, push, and chat
- Use **provider** for the delivery service behind a channel (for example, SendGrid for email, Twilio for SMS)
- Use **Inbox** (capitalized) for the in-app notification component; avoid "notification center"
- Use **topic** for grouping subscribers for bulk notifications
- Use **tenant** for multi-tenant isolation when relevant using contexts feature
- Use **integration** for a configured provider connection in Novu
- Use **environment** for Development or Production contexts
- Use **organization** for the top-level account in the Novu Dashboard
- Use **layout** for email HTML wrappers; **digest** for aggregated notification batches
- Distinguish **Novu Cloud** from self-hosted deployments, and **Community** vs **Enterprise** editions where relevant

## Style preferences

- Use active voice and second person ("you")
- Keep sentences concise — one idea per sentence
- Use sentence case for headings
- Bold for UI elements: Click **Settings**
- Code formatting for file names, commands, paths, and code references
- Capitalize **Novu** and product names: Inbox, Framework, Dashboard
- Include frontmatter `title` and `description` on MDX pages
- Use icons on top-level navigation section titles only (set `"icon"` on groups in `docs.json`), not on individual pages or nested collapsible groups
- For icons we use the [Lucide](https://lucide.dev/) library.
- Prefer Mintlify components (`<Card>`, `<Columns>`, `<Steps>`, `<CodeGroup>`) over raw HTML

## Content boundaries

- Document public platform features, SDKs, and API reference
- Do not document internal admin features, enterprise-only implementation details, or unreleased features
- Link to the [glossary](/platform/additional-resources/glossary) for term definitions rather than redefining them inline
