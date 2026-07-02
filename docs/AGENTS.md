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
- Use `sidebarTitle` for short navigation labels when the page `title` is long (for example, SEO question-format titles)
- API endpoint pages must include a `description` and a 1–2 sentence intro before the OpenAPI block
- Provider integration pages use the title pattern `{Provider} {Channel} Integration with Novu` with `sidebarTitle` for the short provider name
- Use descriptive alt text on all diagrams and screenshots
- See [SEO and GEO maintenance](/SEO_MAINTENANCE.md) for the ongoing review checklist
- Use icons on top-level navigation section titles only (set `"icon"` on groups in `docs.json`), not on individual pages or nested collapsible groups
- For icons we use the [Lucide](https://lucide.dev/) library.
- Prefer Mintlify components (`<Card>`, `<Columns>`, `<Steps>`, `<CodeGroup>`) over raw HTML

## AI prompt blocks

Use the Mintlify `<Prompt>` component for pre-built AI prompts users can copy or open in Cursor. Write prompt text directly inside `<Prompt>` children — do not use `<Snippet />`, which copies as JSX instead of the prompt text.

```mdx
<Prompt description="Add Novu Inbox to my Next.js app" icon="sparkles" actions={["copy", "cursor"]}>
# Add Novu Inbox to Next.js App

Install `@novu/nextjs`...
</Prompt>
```

**When to use `<Prompt>`**

- Integration setup where an AI assistant can implement code in the user's repo (Inbox, workflow triggers, webhooks, agent connect buttons)
- MCP or skills pages where users paste operational prompts into connected AI tools
- Do not use for in-product Copilot-style chat or one-line examples better suited to prose

**Conventions**

- Always set `actions={["copy", "cursor"]}` to match the Novu dashboard
- Use Lucide icons: `sparkles` (integration), `bot` (MCP/skills), `zap` (workflows), `plug` (agents)
- Use `YOUR_*` placeholders for dashboard-specific values (application identifier, subscriber ID, workflow ID)
- Add a `<Note>` near the first prompt on a page telling users to substitute values from **API Keys**, **Subscribers**, or **Workflows** in the dashboard
- Place prompts after prerequisites and adjacent to the code or setup steps they help implement

## Server-side SDK code examples

When documenting REST API operations that developers call from backend code, show examples for **all official server-side SDKs** plus cURL. Do not default to Node.js and cURL only.

**Official server-side SDKs** (see [SDK overview](/platform/sdks#server-side-sdks) and [API reference](/api-reference)):

| Language | Package | Doc page |
| --- | --- | --- |
| TypeScript / Node.js | `@novu/api` | `/platform/sdks/server/typescript` |
| Python | `novu-py` | `/platform/sdks/server/python` |
| Go | `github.com/novuhq/novu-go` | `/platform/sdks/server/go` |
| PHP | `novuhq/novu` | `/platform/sdks/server/php` |
| .NET | `Novu` | `/platform/sdks/server/dotnet` |
| Java | `co.novu:novu-java` | `/platform/sdks/server/java` |

**Tab order** — use `<Tabs>` with this consistent order:

1. `Node.js`
2. `Python`
3. `Go`
4. `PHP`
5. `.NET`
6. `Java`
7. `cURL`

**Conventions**

- Derive SDK examples from the corresponding SDK reference page and the [OpenAPI specification](https://api.novu.co/openapi.json). The REST field `name` maps to `workflowId` in SDKs.
- Keep examples minimal and aligned across tabs — same workflow ID, subscriber ID, and payload shape.
- Use `<YOUR_SECRET_KEY_HERE>` or `NOVU_SECRET_KEY` placeholders; never hardcode real keys.
- Community SDKs (Kotlin, Laravel, Ruby) do not need tabs on platform pages unless the page is SDK-specific.
- Do not edit files under `docs/.mintlify/skills/` in this repo — they are synced from [novuhq/skills](https://github.com/novuhq/skills). Update trigger, subscriber, or preference skill examples there instead.

## Content boundaries

- Document public platform features, SDKs, and API reference
- Do not document internal admin features, enterprise-only implementation details, or unreleased features
- Link to the [glossary](/platform/additional-resources/glossary) for term definitions rather than redefining them inline
