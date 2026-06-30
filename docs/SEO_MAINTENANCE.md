# SEO and GEO maintenance

This document defines the ongoing SEO and GEO (Generative Engine Optimization) maintenance process for [docs.novu.co](https://docs.novu.co).

## Monthly Google Search Console review

1. Open [Google Search Console](https://search.google.com/search-console) for `docs.novu.co`.
2. Review **Queries** for the notification infrastructure keyword cluster:
   - notification infrastructure
   - in-app notification component
   - notification API
   - Novu inbox
   - transactional notifications
3. Prioritize pages with **high impressions but low CTR** (rewrite title/description).
4. Prioritize pages with **low average position** on target queries (expand content depth, add internal links).
5. Submit or verify `https://docs.novu.co/sitemap.xml` in the Sitemaps report.

## Pre-deploy checklist

Before merging documentation changes:

- [ ] Every new MDX page has unique `title` and `description` frontmatter
- [ ] API endpoint pages include a `description` and 1–2 sentence intro before the OpenAPI block
- [ ] Provider pages use the `{Provider} {Channel} Integration with Novu` title pattern
- [ ] Headings on key pages use question format where appropriate
- [ ] Images include descriptive alt text
- [ ] Run `mint broken-links` from the `docs/` directory (requires Mintlify CLI)
- [ ] Run `mint score` to validate SEO/GEO signals including `robotsTxtAllowsAI`

## Quarterly AI citation testing

Test these questions in ChatGPT, Perplexity, and Claude:

1. How do I authenticate API requests with Novu?
2. What are Novu API rate limits?
3. How do I add in-app notifications to a Next.js app?
4. What is Novu and what channels does it support?
5. How do Novu workflows work?
6. How do I send a transactional notification with Novu?
7. What is Novu Inbox?
8. How do I migrate from Knock to Novu?
9. Can I self-host Novu?
10. What is Agent Communication Infrastructure (ACI)?

For each response, verify:

- Whether docs.novu.co is cited
- Whether cited content is accurate
- Whether code examples match current API patterns

Log inaccurate citations and update the corresponding documentation page.

## Technical references

- `llms.txt`: `https://docs.novu.co/llms.txt` (Mintlify auto-generated)
- `sitemap.xml`: `https://docs.novu.co/sitemap.xml`
- `robots.txt`: `https://docs.novu.co/robots.txt`
- Mintlify SEO config: `docs.json` → `seo` block

## Target keyword ownership

| Keyword cluster | Primary doc page |
| --- | --- |
| Open-source notification infrastructure | `/platform`, `/platform/what-is-novu` |
| In-app notification component | `/platform/inbox`, `/platform/quickstart/nextjs` |
| Multi-channel notification API | `/api-reference`, `/api-reference/events/trigger-event` |
| Notification workflows | `/platform/concepts/workflows` |
| Transactional notifications | `/guides/use-cases/transactional-notifications` |
| Agent communication / ACI | `/agents`, `/agents/get-started/what-is-aci` |
| Self-host notifications | `/community/self-hosting-novu/overview` |
| Novu vs competitors | `/guides/migrate-from-*` |
