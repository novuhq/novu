# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This is a **multi-context** monorepo. Layout is declared by a root `CONTEXT-MAP.md` when one exists.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root if it exists - it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- Otherwise **`CONTEXT.md`** at the repo root (legacy / single-context fallback).
- **`docs/adr/`** - system-wide ADRs that touch the area you're about to work in.
- Context-scoped ADRs next to that context's `CONTEXT.md` (paths listed in `CONTEXT-MAP.md`).

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Multi-context repo (presence of `CONTEXT-MAP.md` at the root):

```
/
├── CONTEXT-MAP.md                     ← index of contexts
├── docs/adr/                          ← system-wide decisions
├── apps/
│   ├── api/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/                  ← context-specific (example)
│   └── dashboard/
│       ├── CONTEXT.md
│       └── docs/adr/
├── packages/
└── libs/
```

Exact context roots are whatever `CONTEXT-MAP.md` lists - do not invent paths beyond that file.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the relevant `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal - either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (…) - but worth reopening because…_

## Note on `docs/agents/`

Customer-facing Novu Agents product docs live as MDX under `docs/agents/` and are wired through `docs/docs.json`. This skill-config directory (`docs/agents/skill-config/`) is **agent tooling config only** - keep it out of the Mintlify nav.
