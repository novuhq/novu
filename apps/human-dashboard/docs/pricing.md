# Pricing page

`/pricing` uses the [Agent Inbox Pricing Matrix](https://app.notion.com/p/novuhq/Agent-Inbox-Pricing-Matrix-3f7d03ad838f8073bebec40950dc5130). The user confirmed Hobby, Pro at $10/month, and Enterprise on November 11, 2026. The table overrides the older introductory $30 draft. The empty messages-per-minute row is omitted.

Content lives in `src/data/pricing.ts`; page-local sections live in `src/components/pages/pricing/`. The page reuses the channel templates' shell, fonts, rails, corner squares and FAQ disclosures. Pricing content does not enable checkout or change billing enforcement. Self-serve actions open the existing account flow; Enterprise uses the existing Novu meeting URL.

## Prime reference pack and structural contract

The user explicitly chose the previously downloaded Prime references. No provider API calls, new exports or registry writes are needed. Source remains under `.primeui/temp/exports/`:

| Reference | Cached export | Decision |
|---|---|---|
| `hero--column-centered` | `2026-11-06-plJpbP` | Adapt centered eyebrow, single heading and description; use local type, width and spacing. No image slot. |
| `features-cards--slider-row` | `2026-11-06-J86IU3` | Reference card boundaries, typed content and `cn` conventions. Reject reuse: its carousel, media/caption arrangement and off-canvas topology do not fit three simultaneously visible price plans. |
| `features--tabs-border-split` | `2026-11-06-f2SSfe` | Reference border-separated hierarchy. Reject reuse: hiding comparison values behind tabs or adding a media panel would change the required anatomy. |

These exports were previously delivered through Prime's component-export workflow. The available cached set has no pricing-table candidate; that limitation is covered by the user's explicit cached-reference choice, not a fabricated catalog match.

- Hero: adapted Prime anatomy; one centered h1, no raster media or motion.
- Plans: custom semantic articles, three equal columns from `md`, stacked below; plan, price, capacity, features, CTA in that order. Pro receives an accent treatment without a popularity claim.
- Comparison: custom semantic table on desktop. Mobile presents each feature with a definition list of plan/value pairs; both views use the same data. No hidden feature state, horizontal-scroll trap or billing selector.
- Conversations: custom text/rules/examples layout explaining fixed 24-hour windows, exclusions and billing-cycle attribution. No product mockup.
- FAQ: reuse existing `FaqRow`, including keyboard controls, focus treatment and reduced-motion behavior.

Local conventions win: 960px `LandingShell`, `SectionFrame`, `LandingHeading`, Inter/Redaction/Geist Mono, existing `sapien-*` tokens, orange accent, static Tailwind utilities and `cn`. The new sections are Server Components. No dependencies, custom CSS or raster assets are added. Shared navigation changes are limited to a pricing link in the existing landing footer.

## Verification

Run `CI=true pnpm typecheck`, `CI=true pnpm test`, scoped Biome, and `CI=true pnpm exec playwright test`. Pricing browser tests cover the confirmed matrix, account/demo actions, metadata/sitemap/Markdown requests, all FAQ disclosures, mobile menu, no-JavaScript rendering and responsive overflow. Verify the shared footer on Sapien and channel/agent consumers.

There is no pricing Figma reference. Rendered review establishes consistency with the existing templates; it does not claim exact Figma parity.

The final production build, typecheck, 176 unit tests and all 187 Chromium browser tests pass, including 12 pricing cases. Five complete pricing captures at 320, 375, 768, 1024 and 1440px include decoded fonts/images. Readable slices were reviewed from header to footer. The tablet view reserves equal capacity/feature slots so plan rows align; the narrowest conversation heading avoids an orphan word. Explicit accessible names identify each plan action.

Manual browser checks follow Hobby and Pro into the existing sign-in flow, open the Enterprise meeting page, exercise the comparison link and FAQ, and open/close the mobile menu. No account or booking was created. The production preview must use `localhost` to match the configured development auth origin.

`/pricing` is registered in page metadata, the sitemap and the Markdown-request route allowlist. The shared landing footer links to pricing; its existing header/footer navigation arrays are unchanged. All existing browser consumers pass their regressions. [Production overview](screenshots/pricing.png) is retained for PR review. Pricing verification uses local Chromium; the older channel/agent BrowserStack and exact Figma audits do not cover this new page.
