# Issue tracker: Linear

Issues and PRDs for this repo's engineering skills live in **Linear** (novu workspace), not GitHub Issues.

## Conventions

- **Team**: Engineering
- **Tooling**: Prefer the Linear MCP server `plugin-linear-linear` for create / read / update / comment / label / close / parent / `blockedBy` / `blocks`
- **Identifiers**: Use Linear ids like `NV-8248` in links; in narration refer to issues by **title** (with the link), not bare ids
- **GitHub Issues**: Not used for this skill surface. GitHub remains for PRs and code review only

## When a skill says "publish to the issue tracker"

Create a Linear issue on the Engineering team via the Linear MCP (`save_issue`).

## When a skill says "fetch the relevant ticket"

Load the Linear issue (and comments) via the Linear MCP (`get_issue`, comments as needed).

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single Linear issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding Destination / Notes / Decisions-so-far / Not yet specified / Out of scope. Create with `save_issue` + label `wayfinder:map`.
- **Child ticket**: a Linear sub-issue of the map (`parentId` = map id). Labels: `wayfinder:<type>` where `<type>` is one of `research` / `prototype` / `grilling` / `task`. Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: Linear's **native** `blockedBy` / `blocks` relations — the canonical, UI-visible representation. A ticket is unblocked when every blocker is closed.
- **Frontier**: the map's open children that have no open blocker and no assignee; first in map / creation order wins when the session does not name a ticket.
- **Claim**: assign the issue to the session driver (`assignee: "me"` or the driving user) — the session's first write, before any work.
- **Resolve**: post a resolution comment with the answer, close the issue, then append a context pointer (gist + link) to the map's **Decisions so far**.

## Pull requests as a triage surface

**PRs as a request surface: no.** External PRs are not pulled into the Linear triage queue by `/triage`.
