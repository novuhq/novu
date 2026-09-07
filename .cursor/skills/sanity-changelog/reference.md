# Sanity Changelog — Reference

## Connection

| Field | Value |
|-------|-------|
| Sanity project | `w2rl2099` ("Novu Website") |
| Dataset | `production` |
| Workspace | `default` |
| Studio | Deployed Sanity Studio for the `default` workspace |
| Sanity MCP | `plugin-sanity-Sanity` |
| Linear MCP | `plugin-linear-linear` |

Pass `resource: { projectId: "w2rl2099", dataset: "production" }` to every Sanity MCP call.

## changelogPost schema

Fields: `title` (string), `caption` (text), `slug` (slug, from title), `publishedAt` (datetime — leave unset for draft/unpublished), `authors` (array of refs → `author`), `categories` (array of refs → `changelogCategory`), `cover` (image + `alt`), `content` (Portable Text), `seo` (object: title/description/socialImage/noIndex).

## Fetch reference IDs

Reference `_id`s can change — always query, don't hardcode:

```groq
{
  "authors": *[_type == "author"]{_id, name},
  "categories": *[_type == "changelogCategory"]{_id, title},
  "tags": *[_type == "tag"]{_id, title}
}
```

Look at recent posts for voice + structure:

```groq
*[_type == "changelogPost"] | order(_createdAt desc)[0...3]{title, caption, content}
```

### Snapshot (verify before use — may drift)

- Categories: `Dashboard` `c35549e4-0fa3-45ca-aa88-67bf2c93fc51`, `New Feature` `8979aa18-c496-43fd-acb8-d1f75ac80034`, `Improvement` `4dc00b28-34f9-46c5-a38e-e9f639e956a9`, `Bug Fix` `ccd3b8dd-fdce-4a49-b46d-42922e7ac2c4`, `Chat` `92f4f918-6ca0-4fc2-961f-7808fc5d4e0a`, `Email` `07ef612e-934a-4746-ab52-00d626f6df1e`, `Slack` `c2e41136-141f-4ac2-bd9f-cfd4e68ce09c`, `MCP` `7b34c994-a190-48eb-bebc-dc6f1bb45ef4`, `@novu/react` `68633a07-04e2-4cda-96be-e8777b68692c`, `@novu/js` `8056885d-2a08-4f98-8a8c-364578b87f90`.
- `tag` documents (used by `changeBlock` items): React, Node.js, Notifications, WebSockets, Open Source, Tutorial. Broad — only apply when clearly relevant.

## Portable Text cheat sheet

Every block and span needs a unique `_key`.

Paragraph / heading (styles: `normal`, `h2`, `h3`):
```json
{ "_type": "block", "_key": "k1", "style": "normal", "markDefs": [],
  "children": [ { "_type": "span", "_key": "k1s1", "marks": [], "text": "..." } ] }
```

Bold lead-in + link (marks: `strong`, `code`, or a markDef `_key`):
```json
{ "_type": "block", "_key": "k2", "style": "normal",
  "markDefs": [ { "_key": "lnk", "_type": "link", "href": "<docs-url>" } ],
  "children": [
    { "_type": "span", "_key": "a", "marks": ["strong"], "text": "Label — " },
    { "_type": "span", "_key": "b", "marks": [], "text": "sentence, " },
    { "_type": "span", "_key": "c", "marks": ["lnk"], "text": "link text" },
    { "_type": "span", "_key": "d", "marks": [], "text": "." }
  ] }
```

Bullet list item (`listItem: "bullet"`, `level: 1`):
```json
{ "_type": "block", "_key": "k3", "style": "normal", "listItem": "bullet", "level": 1,
  "markDefs": [], "children": [ { "_type": "span", "_key": "k3s1", "marks": [], "text": "..." } ] }
```

Code block:
```json
{ "_type": "codeBlock", "_key": "k4", "language": "bash", "code": "npx novu dev" }
```

Image block (asset must already exist in Sanity — see image limitation):
```json
{ "_type": "image", "_key": "k5", "variant": "default",
  "asset": { "_type": "reference", "_ref": "image-<hash>-<w>x<h>-png" } }
```

## changeBlock template

`type` is `"improvements"` or `"fixes"`. Each item: portable-text `text` (bold lead-in + sentence) and optional `tag` ref.

```json
{ "_type": "changeBlock", "_key": "changeImprovements", "type": "improvements",
  "items": [
    { "_key": "imp1",
      "text": [ { "_type": "block", "_key": "imp1b", "style": "normal", "markDefs": [],
        "children": [
          { "_type": "span", "_key": "imp1a", "marks": ["strong"], "text": "Area — " },
          { "_type": "span", "_key": "imp1c", "marks": [], "text": "what changed and why it helps." }
        ] } ] }
  ] }
```

Append after a feature post's body, typically under an `h2` like "Also new across the platform", with an `improvements` block then a `fixes` block.

## create / patch / publish

- **Create draft**: use Sanity MCP `create_documents` only — it always writes to `drafts.<uuid>` (do not set `_id` in `content`, and do not pass `releaseId`). Example: `{ type: "changelogPost", content: { ...fields } }`. Verify the returned id starts with `drafts.`.
- **Never** use raw `@sanity/client` `create()` without `_id: "drafts.<uuid>"` — omitting `_id` there creates a published document. Leaving `publishedAt` unset does not make a document a draft.
- **Patch**: `patch_documents` → `documents: { "drafts.<id>": { patches: [ { insert: { after|before|replace: "content[_key==\"KEY\"]", items: [ ... ] } } ] } }`. Prefer targeting by `_key` to preserve concurrent edits.
- **Discard** a never-published draft: `discard_drafts` → `{ ids: ["drafts.<id>"] }` (permanent).
- **Publish**: `publish_documents` — only when explicitly asked.

## Linear release review

For "improvements & fixes since the last release":

1. `list_release_pipelines` → Cloud Production (`cloud-production`, id `c39d8470-d232-4872-b282-2f4df1dd9bc3`).
2. `list_releases` for that pipeline. The last changelog-published release is typically marked with a 📒 emoji in its name — treat everything after it as the review window.
3. For each newer release slug: `list_issues` with `{ release: "<slug>", limit: 100 }`. Use `get_issue` for detail on truncated descriptions.
4. For large windows (many releases), delegate the fetch-and-filter to a `generalPurpose` subagent with the criteria below.

### Include (customer-relevant)

Bug fixes and UX/product improvements a customer would notice: dashboard, Inbox, workflow editor, API correctness, subscriber/preferences, delivery/providers (email/SMS/push/chat), SDKs (`@novu/react`, `@novu/js`, `@novu/api`), agents product. Customer-facing reliability/perf fixes count.

### Exclude

Dependency/CVE version bumps; internal security hardening not user-visible; refactors, test/eval harnesses, CI/build tooling; WIP scaffolding for unreleased features.

Flag genuinely major standalone features separately — they usually deserve their own entry, not a roundup line.
