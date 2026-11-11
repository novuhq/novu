# Channel and agent page templates

The templates follow the supplied **Agent Inbox Channel Pages: Page Structure**
PDF and these Figma frames:

- [Channel: Telegram](https://www.figma.com/design/BAJhLPKBS5jBYw33XHjlea/Untitled?node-id=2-514)
- [Agent: OpenClaw on Telegram](https://www.figma.com/design/BAJhLPKBS5jBYw33XHjlea/Untitled?node-id=2-862)

## Routes and content

| Channel | Agent pages |
| --- | --- |
| `/email` | `/email/<agent>` for all ten registered agents |
| `/telegram` | `/telegram/<agent>` for all ten registered agents |
| `/slack` | `/slack/<agent>` for all ten registered agents |

Agent slugs: `claude-code`, `codex`, `opencode`, `cursor`, `hermes`, `openclaw`,
`claude`, `chatgpt`, `grok-bot`, and `any-agent`. These make 33 public landing routes.

Unsupported pairs return 404. Channel slugs share the existing `[host]` route;
existing host setup pages continue to use `HostPage`. Each new route has canonical,
sharing and structured metadata and appears in the sitemap.

Composition is in `src/app/[host]/page.tsx` and
`src/app/[host]/[agent]/page.tsx`. Sections live in
`src/components/pages/channels/`. The typed content and supported route matrix
live in `src/data/channel-pages.ts`.

Telegram and Telegram/OpenClaw are the supplied visual references. Commit
`1f488da9d` fills the channel and agent copy, commands, prompts and metadata from
the page specification. Prompt scenes now reflect their channel and agent; hero
JPEGs remain shared illustrative Telegram artwork. Separate channel artwork has
not been approved against its own Figma reference. Archived exact-reference
audits below predate these copy/scene changes. Review external documentation
destinations and execute CLI setup separately before release.
The sample message commands and terminal output are examples; browser verification
does not execute the CLI or send any messages.

Review of the CLI at that commit identified two email-instruction corrections.
Fresh CLI email setup now runs `agentinbox login` after creating the address and
before outbound examples, including the hub, OpenClaw and any-agent guides.
The sign-up example uses `agentinbox list --senders all` to include verification
mail from new senders, then explains `agentinbox show <conversation-id>` to read
the thread. Two unit regressions cover these cases. The command-quoting test
stubs each line separately, including multiline setup snippets.

The November 11 follow-up passes the production build, typecheck, scoped Biome,
176 unit tests and all 187 Chromium browser tests, covering all 33 landing routes
and the new pricing page. Historical counts and Figma measurements below refer
to their dated runs.

## Shared sections and interactions

The channel page composes hero, features, setup, message tabs, supported agents,
reach rules, use cases, FAQ, CTA, and resource links. The agent page composes
breadcrumbs and hero, benefits, setup, prompt carousel, capability links, FAQ,
and CTA with related routes.

Both use Sapien's shell, fonts, tokens, section rails, Radix tabs, clipboard
controls, carousel and FAQ rows. The FAQ and section frame gained opt-in landing
variants; Sapien's default presentation is preserved. Setup tabs advance every ten
seconds, can be paused, stop when selected or focused, and respect reduced motion.
Setup descriptions remain mounted and expand/collapse over 200ms, with motion
disabled for reduced-motion preferences. Focusing or interacting with the command
panel pauses playback, including Copy. Playback stops when reduced motion is
enabled, and its control is hidden while that preference blocks playback. Inactive descriptions are hidden from
assistive technology. Message tabs, clipboard actions, carousel buttons and arrow keys, native FAQ
summaries, breadcrumbs and related links are functional. Preview conversations
are illustrations.

## Artwork

`public/images/landing/` contains 2× JPG hero interiors, transparent 2× PNG CTA/prompt
previews, isolated SVG logos/icons and approval content, and the source particle texture
as JPG. Outer card corners, borders, glows and shadows are CSS. Prompt illustration
exports use absolute bounds so the third slide is not clipped by its source
carousel. No signed Figma asset URLs are used at runtime.

## Local setup

Run from the monorepo root with Node 22 and the pinned pnpm:

```sh
CI=true npx --yes pnpm@11.28.2 --filter @novu/human-dashboard... install --frozen-lockfile
npx --yes pnpm@11.28.2 --filter @novu/human-dashboard dev
```

The sparse checkout needs existing `patches/` for the frozen lockfile and
`biome-plugins/` for scoped lint. Root manifests and lockfile are unchanged.
The app declares Next.js 16.3.8; the root override resolves 16.4.2 locally.

Development variables were pulled from Vercel project
`novuhq/agent-inbox-dashboard` into ignored `.env.local`. From the app directory,
an authenticated operator can refresh them with:

```sh
npx --yes vercel env pull .env.local --environment development --project agent-inbox-dashboard --scope novuhq --yes
```

Keep this file permission-restricted and never print or commit its values.
The approved Prime project binding is local and ignored, along with generated
agent scaffolding and temporary exports. No dependencies were added to the app.

## Verification and visual audit

Scoped Biome, typecheck, 167 unit tests and the production build pass. All 153
production Chromium browser tests pass, including existing home, Sapien, SEO and
host routing checks. Template checks cover all eleven routes, unsupported pairs,
metadata, loaded images, tabs, clipboard values, FAQ, carousel navigation, related
links, narrow layouts, no-JavaScript content and the mobile header menu.

The refreshed Prime visual audit from 2026-11-09 **passes for both supplied reference
pages** at a 1920×1080 browser viewport, including the CLI review corrections.
After the illustration polish, pass three has score 0 and zero violations for each
page, with no masks and unchanged default thresholds. Raster differences are
0.9006% for the channel page and 0.7736% for the agent page, below the 1% limit.
Full-page dimensions match Figma: 1920×6726 and 1920×5107. Fresh read-only Figma
measurements confirmed the source geometry, typography and line counts.
Other responsive widths are usability checks; no corresponding Figma frames were
supplied for those widths or the other channel/agent variants.

Hero overflow is clipped inside the illustration so the outer rails and corner
squares stay visible. Rail/divider positions account for physical section borders.
An 8px square is drawn inside a 9px SVG viewport to align its painted center with
the one-pixel rails; CSS box coordinates alone missed a half-pixel paint offset.
Screenshot regressions check both axes at the upper and lower hero corners at
375, 1389 and 1440px widths and 1×/2× pixel density on both reference templates.
The message preview area has a fixed 336px height and correct intrinsic image
dimensions, preventing the Ask image from expanding the panel. Tab cycling checks
confirm stable panel/section heights and following-content positions for all
three channels at 375, 768 and 1440px. The existing setup-transition checks cover
intermediate frames, interrupted selection and reduced motion.

The refinement corrects card padding and text positions, use-case command sizing,
selected tab appearance, exact reference copy, isolated vector logo exports,
transparent CTA artwork and template-specific header destinations. Header and
mobile-menu items are opt-in; Sapien retains its existing default navigation.

The collector now counts lines on text/control nodes, leaving structural frames
nonapplicable. It also converts native CSS Lab/sRGB colors into equivalent RGBA
using the browser's sRGB renderer while preserving alpha. Real Figma text nodes
are audited against exact SVG-derived line counts. A two-line regression fixture
validates these changes; untouched canonical captures remain alongside the typed
captures. Neither saved measurements nor the bundled auditor or its thresholds
were altered to clear violations.

Production screenshots of the two reference templates are committed in
`docs/screenshots/` for PR review.

Latest evidence is in the ignored directory
`.primeui/temp/figma-to-prime/channel-agent-final-20261109/`. It contains
machine results, the retained exact Figma baseline, fresh production browser
measurements, reference/rendered PNGs, raw canonical captures, overlays, diffs,
a magnified painted-center comparison and verification notes. Earlier runs retain
the collector fixture and source exports; blocked results remain as history.

Prime source exports remain the implementation references from initial setup.
No new Prime provider access was needed for this refinement. No Prime pages or
variants, deployment or unrelated application sources changed.

## PR review corrections (2026-11-09)

All eleven landing routes are registered with the Markdown 404 guard; clients
that prefer Markdown receive the HTML landing page instead of a false 404.
Unsupported channel/agent pairs and unimplemented `.md` routes remain 404s.

Copied prompts point to `/agents.md`, ask for required setup values, and name the
`--email` and `--agent-name` flags needed without an interactive terminal. Telegram
setup and FAQ describe the required BotFather token. Test messages select the
page's channel with `--via`. Examples use the supported plain-message syntax,
shell-safe refund quoting, and unique option IDs with full time labels.

Regression tests parse the command strings through a shell with `printf` in place
of the CLI; no messages are sent. Browser checks cover all routes with a mixed
Markdown/HTML Accept header, Copy while autoplay is running, pause/resume, and
changes to the reduced-motion preference. The committed screenshots show the
corrected copy. The refreshed 2026-11-09 audit includes these intentional copy corrections;
Figma remains the geometry and artwork reference.

In the sparse checkout, use `CI=true` for pnpm checks and install only with
`--frozen-lockfile`, so automatic dependency synchronization cannot prune the
monorepo lockfile. Root manifests and lockfile remain unchanged by this PR.

## Final design and illustration QA (2026-11-09)

Readable comparisons cover both reference pages from header to footer, all four
message states and all three prompt slides. Hero JPEGs, transparent CTA/prompt
PNGs, particle texture and outlined SVG logos/icons were checked for missing
media, clipping, unwanted corners/shadows, seams and scaling defects. Raster
conversation text retains the expected softness of a 2× bitmap; no broken or
truncated illustration exports were found.

The close-up review corrected stretched reach-icon boxes, the agent hero's tile
borders, both CTA corner glows, the capability links' pixel-style arrow SVG and
the landing FAQ's active rail color. The mobile hero glow fades to black before
its clipped media boundary, preventing a visible orange rectangle beneath the
conversation. Outer illustration shells remain CSS; the new arrow is an isolated
vector export.

The BrowserStack core matrix covers Windows Chrome/Edge/Firefox, macOS
Chrome/Safari, iPhone 17/iOS 26 and iPhone 13/iOS 18 Safari, OnePlus 13R/Android 15
Chrome, and Galaxy S25/Android 15 Samsung Internet. OnePlus substitutes for the
unavailable Galaxy A16. Full-page capture uses native Chromium/Firefox protocols
and measured scroll stitching for Safari/mobile. Native mobile originals and
viewport calibration are retained with the run artifacts.

Standard Safari Automate clicks on iOS do not grant user activation. Native
Appium context taps, after web-tap calibration, verified trusted input and actual
clipboard writes on iPhone 17 and iPhone 13 for both templates, including command
and setup-prompt contents. The manual-copy fallback also passes. All ten
functional/visual matrix rows pass: 132 core assertions and four additional
setup-prompt copy checks. Vercel's preview toolbar is recorded separately from
application UI; no account, project or production settings changed for QA.

[Desktop matrix sessions](https://automate.browserstack.com/builds/f5783cd392511ad56a8f4c151a638f6516d9882d)
and [final mobile/trusted-copy sessions](https://automate.browserstack.com/builds/870594f4e9feacb44180169573a6169b05615339)
provide remote evidence.
Local run reports, native screenshots, readable
review slices and the credential-free temporary harness are retained outside
product source under the dated QA run directory.
