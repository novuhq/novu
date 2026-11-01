---
status: accepted
date: 2026-10-22
---

# agentinbox.md opens on the page for agents; people read /sapien

The website moved into `apps/human-dashboard` from the private `novuhq/human-website` repo with its layout unchanged: the root (`/`) is the terse CLI reference written for agents, with `/index.md` as its Markdown and `/llms.txt` pointing to both, and the product page for people is `/sapien`. That is the idea the site started with on gethuman.md: a `.md` domain whose front page an agent can read and act on, with a "Human? Visit …/sapien" line for everyone else. The dashboard's earlier people-first landing at `/` was removed rather than kept beside it.

## Considered options

- The product page at `/` and the reference at `/agents`. Rejected: it breaks the site's premise that the domain itself is the documentation an agent is handed, and the pages were moved as they were designed.
- One Markdown document for agents (`/agents.md` redirecting to `/index.md`, or the other way round). Rejected: they are read at different moments. `/index.md` is for an agent that knows nothing yet; `/agents.md` is for a host an operator just connected from the dashboard, and the connect prompt links to it.

## Consequences

- A person who types the domain lands on the agents' page first; the banner, the "for human" link and the people page's own header (with "sign in") lead on.
- `/agents.md` stays as it is (the connect steps, then the skill from `SKILL.md`); the robots page and `/llms.txt` link to it.
- The robots page and `/index.md` are written by hand in `apps/human-dashboard/src/data/home.ts`, so a change to a CLI command needs that file changed too.
