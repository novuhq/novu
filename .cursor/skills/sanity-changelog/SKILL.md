---
name: sanity-changelog
description: >-
  Create and publish Novu changelog entries in Sanity (changelogPost documents),
  including feature posts, "improvements & fixes" roundups built from Linear
  releases, and the Changes (changeBlock) component. Use when asked to write a
  changelog entry, announce a shipped feature on the changelog, roll up
  improvements/bug fixes since the last release, or work with Sanity changelog
  content for the Novu website.
---

# Novu Sanity Changelog

Authoring workflow for Novu changelog entries. Content lives in Sanity (`changelogPost`), reviewed from Linear releases. Uses the Sanity MCP (`plugin-sanity-Sanity`) and Linear MCP (`plugin-linear-linear`).

Connection constants and all templates/IDs are in [reference.md](reference.md) — read it before creating or patching documents.

## Target

- Sanity project **`w2rl2099`** ("Novu Website"), dataset **`production`**, workspace **`default`**.
- Document type: **`changelogPost`**.
- Always create as **drafts** (leave `publishedAt` unset). Never publish unless explicitly asked.

## Workflow

```
- [ ] 1. Load reference.md; confirm project/dataset
- [ ] 2. Resolve author + category (and tag) reference IDs via GROQ (don't hardcode)
- [ ] 3. Gather source material (feature: explore codebase / screenshot; roundup: Linear releases)
- [ ] 4. Draft content in Novu changelog voice
- [ ] 5. create_documents (draft) — text first
- [ ] 6. Handle images (manual Studio upload — MCP cannot upload local files)
- [ ] 7. Report draft IDs + Studio link; publish only if asked
```

### 1–2. Setup and references

References (`authors`, `categories`, `tag`) are documents — resolve their `_id`s at runtime, never assume. Run the GROQ in [reference.md](reference.md#fetch-reference-ids). Pick the author = the person shipping/announcing, plus 1–2 categories (e.g. `Dashboard` + `New Feature`, or `Improvement` + `Bug Fix`).

### 3. Source material

- **Feature entry**: understand the feature accurately before writing. For dashboard/SDK features, explore the relevant `apps/` or `packages/` code (or delegate to the `explore` subagent) so copy matches real behavior — don't over-promise from a mockup.
- **Improvements & fixes roundup**: review Linear releases since the last published changelog. See [reference.md](reference.md#linear-release-review). Filter to customer-relevant items only; exclude dependency/CVE bumps, internal refactors, test/CI, and WIP scaffolding.

### 4. Voice

- Benefit-oriented and concrete; active voice; short paragraphs.
- Feature posts: intro paragraph → `h2` sections → optional `codeBlock` → closing line with a docs link.
- Roundup / change items: **bold lead-in label** (area or feature) + em dash + one clear sentence. No `NV-xxxx` IDs in public copy. Group by area.
- Match the tone of recent posts (query the latest few — see reference).

### 5. Create

Use `create_documents` with the Portable Text structure from [reference.md](reference.md#portable-text-cheat-sheet). Every block/span needs a unique `_key`. Keep `create_documents` JSON valid — brace/bracket errors are the most common failure.

### 6. Images (known limitation)

The Sanity MCP **cannot upload a local image** — `generate_image` only creates AI images. To attach a real screenshot:
- Have the user drop it into the **Cover Image** field (or an inline image block) in Studio, OR
- If a Sanity write token is provided, upload via the assets HTTP API and set the `cover` / an `image` block by `asset._ref`.

Studio: open the `changelogPost` in the deployed Sanity Studio for the `default` workspace.

### The Changes component (`changeBlock`)

For an "improvements & fixes" section — standalone or appended to a feature post — use the `changeBlock` object (`type: "improvements" | "fixes"`, `items[]` with portable-text `text` and optional `tag` reference). Template in [reference.md](reference.md#changeblock-template). Leave `tag` off unless a listed tag clearly fits.

## Editing existing drafts

- Patch with `patch_documents` using `insert` (`before` / `after` / `replace`) targeting array items by `_key`, e.g. `content[_key=="fd1ce739c172"]`. This preserves the user's other edits (uploaded images, author, caption, `publishedAt`).
- Remove a redundant draft with `discard_drafts` (permanent for never-published drafts — confirm intent).
- Publish with `publish_documents` only when explicitly requested.
