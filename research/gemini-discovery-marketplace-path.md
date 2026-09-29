# NV-8867: What does the real Marketplace path require, and can any of it be tested without a live listing?

Researched 2026-09-29. Claims are marked documented, inferred, or unknown without Google. Numbers in brackets point to **Sources**.

## Answer

- **Google is involved at every gate of the real path.** Novu would have to join the Partner Network, sign the Marketplace Vendor Agreement, and nominate the agent through a Google representative. A Google-supplied form unlocks Producer Portal. A Partner Engineer turns on the Procurement API and creates the Pub/Sub topic. Google then reviews product details, pricing and technical integration, validates the Agent Card, and runs its own tests before it hands over a `gcloud` command that makes the listing public. [S1][S3][S7][S8][S10] (documented)
- **No documented draft, unlisted or test listing works without Google.** Producer Portal Preview, Test Billing Accounts and the SaaS codelab "DEMO" product all need Producer Portal access. A private offer needs a product that is already "integrated with and listed on" Marketplace. [S8][S16][S17][S18][S20] (documented)
- **"Runs on Google Cloud" is checked in a Google approval step during onboarding.** Two hosting patterns apply to AI agents. Pattern 8: everything, including the agent, runs on Google Cloud. Pattern 9: the core agent runs on Google Cloud and uses Google or Model Garden models; smaller control planes can run elsewhere, but the Google-hosted agent must be the resource whose consumption grows fastest. [S9] (documented)
  - A thin Cloud Run proxy in front of a Novu API hosted elsewhere probably fails Pattern 9. (inferred)
  - A Discovery Agent on Cloud Run calling Gemini on Vertex AI, with the Novu API as the supporting control plane, plausibly fits. Whether Google accepts it is unknown without Google.
- **Default model rule, exact text:** "Use Google foundation or 3rd party models hosted in Model Garden as a default configuration." [S1] (documented)
- **Novu's integration work is concrete and can be built now:**
  - a Pub/Sub handler that approves accounts and entitlements through the Partner Procurement API
  - a DCR endpoint that verifies a Google-signed `software_statement` JWT and checks `google.order` against stored orders
  - Service Control usage reports, only if pricing is usage-based

  [S10][S12][S13][S14] (documented)
- **The demo can reproduce the Gemini Enterprise half for real:** Add agent → Custom agent via A2A, the OAuth fields or an `authorizations` resource, sharing, the user's OAuth consent, the Agent Gallery "From your organization" section, and `@mention`. [S22][S24] (documented)
- **The demo must mock everything Marketplace-side:** the listing, Subscribe or private offer, Pub/Sub and Procurement, "Go to Gemini Enterprise", the "Agents via Marketplace" picker, the DCR call from Google, the procurement and access-request queues, and billing.

## Listing requirements

### Agent Card

- **Format and storage.** The card is JSON aligned to the A2A Agent Card spec. It is uploaded to a Cloud Storage bucket with Object Versioning, in the same project as the Producer Portal product, and selected in Producer Portal under **Agent Card → Browse → Save and validate**. [S2] (documented)
- **Validation.** The card is checked against "necessary thresholds". If it falls short, Producer Portal lists the gaps. The thresholds are in an "Agent ScoreCard guide provided to you", which is not public. [S2] (documented; thresholds unknown without Google)
- **Content Google recommends.** Make the card "as complete as possible". Important features are "skills, competence, models, and security". You can optionally fill the listing's description and metadata from the card. [S2] (documented)
- **Fields in Google's example card** [S10] (documented):
  - Required: `url` (the base A2A endpoint), `provider.organization`, `provider.url`, and the DCR `target_url` if DCR is implemented.
  - Optional: `iconUrl`, which Gemini Enterprise displays.
  - Also present: `name`, `protocolVersion`, `description`, `preferredTransport: "JSONRPC"`, `version`, `capabilities` (`streaming`, `pushNotifications`, `extensions`), `defaultInputModes` and `defaultOutputModes`, `skills[]` (`id`, `name`, `description`, `tags`, `examples`), `supportsAuthenticatedExtendedCard`, and `security` plus `securitySchemes`.
  - Auth scheme: `oauth2` with the `authorizationCode` flow (`authorizationUrl`, `tokenUrl`, `refreshUrl`, `scopes`).
  - DCR declaration: an entry in `capabilities.extensions` with `uri: https://cloud.google.com/marketplace/docs/partners/ai-agents/setup-dcr` and `params.target_url`. That URI returned 404 when checked on 2026-09-29, so it appears to be an identifier only.
- **What Gemini Enterprise uses the card for:** display name, description and metadata; finding the DCR endpoint; discovering the entry points for messages and task status; deciding which auth methods are required. [S10] (documented)
- **Allowed auth schemes.** Only "public access" (for agents that touch no user data) or the "OAuth 2.0 Authorization Code Grant Flow". [S10] (documented)
- **Version conflict to resolve:**
  - Gemini Enterprise "supports the A2A v0.3 streaming mechanism". Agents on v1.0 must use the SDK's v0.3 compatibility packages. [S22] (documented)
  - Google's Marketplace example says `"protocolVersion": "1.0"` but uses v0.3 field names (`url`, `preferredTransport`, `supportsAuthenticatedExtendedCard`). [S10][S27]
  - A2A v1.0 replaced those fields with `supportedInterfaces[]`. [S28]
  - A2A v0.3.0 requires `capabilities`, `defaultInputModes`, `defaultOutputModes`, `description`, `name`, `protocolVersion`, `skills`, `url` and `version`. Each skill requires `id`, `name`, `description` and `tags`. [S27] (documented)
  - Recommendation: ship the v0.3.0 card shape. (inferred) Which `protocolVersion` string the validator accepts is unknown without Google.
- **UI extension.** A2UI can be used for rich UI inside Gemini Enterprise. [S10] (documented)

### "Runs on Google Cloud"

- **Why the A2A product type exists:** "Offer AI agents that run on Google Cloud, integrate with Gemini Enterprise, and use the Agent2Agent (A2A) protocol." [S1] (documented)
- **General product rule:** "You must verify to Google Cloud through an approval process during onboarding that you host your software product primarily on Google Cloud." [S9] (documented)
- **Pattern 8, AI agents hosted on Google Cloud:** "Your product is an AI Agent as a Service registered through Gemini Enterprise and all of its supporting components, including the AI agent, run entirely on Google Cloud." [S9] (documented)
- **Pattern 9, AI agents with hybrid infrastructure:** "your core product runs on Google Cloud and uses either Google foundational models or models from the Model Garden. Smaller control planes or supporting infrastructure, run on-premises or on another cloud. In this case, your Google Cloud-hosted Agent must be the resource whose consumption increases the fastest when your users increase their consumption." [S9] (documented)
- **Further requirement:** "Your listing must result in meaningful Google Cloud consumption by the customer procuring or using the solution." [S9] (documented)
- **Does Novu API hosting count?** The rule is about the product as a whole. The agent endpoint alone is not enough if the heavy work happens off Google Cloud. (inferred from the Pattern 9 wording)
  - If the Novu API stays off Google Cloud, Novu must argue Pattern 9: the Cloud Run agent and its Vertex AI Gemini calls grow fastest, and the Novu API is a "smaller control plane".
  - A Cloud Run front door that only proxies to the Novu API most likely does not meet "resource whose consumption increases the fastest". (inferred)
  - The final call rests with the onboarding approval, so it is unknown without Google.
- **Google's reference architecture** puts the agent and the "marketplace handler" (procurement plus DCR) in the partner's project, and the Procurement API and Pub/Sub in a separate "Partner Marketplace project". [S10] (documented)

### Default model

- **Exact text:** "Use Google foundation or 3rd party models hosted in Model Garden as a default configuration." [S1] (documented)
- **Other A2A-specific requirements in the same list** [S1] (documented): no professional services or hardware billed through Marketplace; customer-ready, secure and enterprise-grade; built in line with Google's AI Principles; "discoverable through primary Google surfaces, such as Gemini Enterprise"; supports A2A.
- **Implication for the demo stack:** Gemini is a Google foundation model. Whether the Gemini Developer API (AI Studio) meets the rule, or whether Vertex AI or Model Garden hosting is expected, is not stated. Plan on Vertex AI for any real listing. (inferred; unknown without Google)

## Procurement and entitlements

- **Prerequisites** [S7][S11] (documented):
  - A Partner Engineer enables the restricted Cloud Commerce Partner Procurement API and creates the Pub/Sub topic.
  - In **Producer Portal → Technical integration → Billing integration**, link three service accounts: one for the Procurement API, one for Pub/Sub (Pub/Sub Editor), and one with `roles/servicemanagement.serviceController` for usage reporting.
  - Build a client library from `https://cloudcommerceprocurement.googleapis.com/$discovery/rest?version=v1`, because the API is restricted.
- **AI-agent specifics:**
  - Google's blog says "No frontend integration is required for this solution type". [S10]
  - The AI-agent overview still lists "Link the accounts to their Google accounts" and "sign in using their Google credentials". [S1] (documented conflict)
  - The blog calls Procurement and Pub/Sub integration "mandatory". [S10]
- **Pub/Sub events** [S13] (documented):
  - Accounts: `ACCOUNT_ACTIVE`, `ACCOUNT_DELETED`. `ACCOUNT_CREATION_REQUESTED` is deprecated.
  - Entitlement start: `ENTITLEMENT_CREATION_REQUESTED`, `ENTITLEMENT_OFFER_ACCEPTED`, `ENTITLEMENT_ACTIVE`.
  - Plan changes: `ENTITLEMENT_PLAN_CHANGE_REQUESTED`, `ENTITLEMENT_PLAN_CHANGED`, `ENTITLEMENT_PLAN_CHANGE_CANCELLED`.
  - Cancellation: `ENTITLEMENT_PENDING_CANCELLATION`, `ENTITLEMENT_CANCELLING`, `ENTITLEMENT_CANCELLED`, `ENTITLEMENT_CANCELLATION_REVERTED`.
  - Lifecycle: `ENTITLEMENT_RENEWED`, `ENTITLEMENT_OFFER_ENDED`, `ENTITLEMENT_DELETED`.
- **Approve and reject flow** [S12][S13][S15] (documented):
  1. A new account arrives as `ACCOUNT_ACTIVE` with a `PENDING` approval named `signup`. Approve it with `POST v1/providers/{partner}/accounts/{id}:approve {"approvalName":"signup"}`.
  2. `ENTITLEMENT_CREATION_REQUESTED` puts the entitlement in `ENTITLEMENT_ACTIVATION_REQUESTED`. Call `entitlements/{id}:approve` to make it `ENTITLEMENT_ACTIVE`, or `:reject {"reason": ...}` to cancel it.
  3. Plan changes use `:approvePlanChange {"pendingPlanName": ...}` or `:rejectPlanChange`.
  4. The API also has `accounts:reject`, `accounts:reset` (cancels all entitlements), entitlement `PATCH`, and `:suspend` ("not yet supported").
- **Rules for the handler** [S13] (documented): if multiple orders of the same product are allowed, key on `ENTITLEMENT_ID`, not account or product. On `ENTITLEMENT_DELETED` or `ACCOUNT_DELETED`, delete the customer's data.
- **Entitlement fields** include `account`, `plan`, `orderId`, `usageReportingId`, `consumers`, `offer`, `offerEndTime` and `state`. [S15] (documented)
- **Account linking (how a buyer becomes a Novu org):**
  - Google's reference flow: the handler stores "the unique Order ID". At install time the DCR JWT carries `google.order`. "If the IDs match, the secure registration completes." [S10] (documented)
  - For Novu, the natural key from purchase to Novu organisation is therefore the order ID, or the procurement account, not the Google Cloud project. (inferred)
- **Usage reporting (only for usage-based or combined pricing)** [S14][S16][S29] (documented):
  1. Call `services.check`. If `checkErrors` is empty, call `services.report` with an Operation.
  2. The Operation sets `consumerId` to the entitlement's `usageReportingId`, plus `startTime`/`endTime`, `metricValueSets` and a unique `operationId`.
  3. Report hourly.
  4. Add the optional `userLabels`, including the reserved `cloudmarketplace.googleapis.com/resource_name` and `container_name`.
- **Pricing models:** free, subscription, usage-based or combined. Up to 24 plans, 8 metrics per usage plan, and an optional free trial (at least 5 days and at least USD 50). Pricing review takes up to 4 business days. [S6][S1] (documented)

## DCR and OAuth

- **Purpose.** DCR lets Gemini Enterprise "programmatically register itself as an OAuth client with your agent's authorization server". [S10] (documented)
- **When it is required:** the example card marks the DCR URL "required if the agent implements DCR", and the Agent Card is used to "Locate endpoints for Dynamic Client Registration (if supported)". [S10] Whether DCR is mandatory for OAuth Marketplace agents, and what the install screen shows without it, is not documented. (unknown without Google)
- **The request Google sends** [S10] (documented):
  - `POST {target_url}` with body `{"software_statement": "<JWT>"}`.
  - JWT header: `RS256` with a `kid`.
  - JWT claims in Google's example: `aud` (the provider URL); `auth_app_redirect_uris: ["https://vertexaisearch.cloud.google.com/oauth-redirect"]`; `iat` and `exp`, 300 seconds apart; `google.order`; `iss: https://www.googleapis.com/service_accounts/v1/metadata/x509/cloud-agentspace@system.gserviceaccount.com`; `sub`.
- **What Novu's endpoint must do** [S10] (documented):
  1. Verify the signature with Google's public keys.
  2. Cross-check `google.order` against the procurement records.
  3. Create an OAuth or OIDC client.
  4. Return `{"client_id", "client_secret", "client_secret_expires_at": 0}`.
- **Gaps in the DCR docs:** the meaning of `sub` and the error format are undocumented (unknown without Google). The body and response names follow RFC 7591. (inferred) This repo has branch names that suggest earlier OAuth DCR work for MCP (`cursor/nv-7889-polish-mcp-oauth-dcr`, enterprise `feat/oauth-dcr`); not inspected. Google's variant adds the signed statement and the order check. (inferred)
- **Runtime headers, from the custom A2A docs** [S22] (documented): Gemini Enterprise sends the end user's token as `Authorization: Bearer ...` once the user consents. On Cloud Run it also sends `X-Serverless-Authorization`, a Discovery Engine service-agent ID token that needs `roles/run.invoker`. The same headers are assumed for Marketplace agents. (inferred)
- **OAuth redirect URIs to allow:** `https://vertexaisearch.cloud.google.com/oauth-redirect` and `https://vertexaisearch.cloud.google.com/static/oauth/oauth.html`. [S22] (documented)
- **Authorization resource.** `projects/{p}/locations/{l}/authorizations/{id}` with `serverSideOauth2`: `clientId`, `clientSecret`, `authorizationUri`, `tokenUri`, and optionally `scopes`, `pkceVerificationEnabled` and `basicAuthenticationEnabled`. [S22][S26] (documented) The schema is generic, so a Novu-run authorization server should work. (inferred)
- **End-user experience:** "Upon the first interaction, the user will be prompted to complete an OAuth authorization by inputting their partner-system username and password." [S10] (documented)

## Admin install flow

**Roles and prerequisites:** Gemini Enterprise Admin role, Consumer Procurement Entitlement Viewer role, Discovery Engine API enabled, an existing Gemini Enterprise app, an agent already on Marketplace. [S21] (documented)

**Purchase (Billing Administrator)** [S10] (documented):
1. Browse the "Agent Marketplace" category in Cloud Marketplace.
2. Click **Subscribe**, or accept a **Private Offer**.
3. Google sends Pub/Sub to the partner, who approves the account and entitlement. The order is now active.

**Handoff to Gemini Enterprise (Discovery Engine Administrator)** [S10] (documented):
1. Click **Go to Gemini Enterprise** on the purchased listing.
2. Sign in to the project that holds the Gemini Enterprise licences. That project must be linked to the billing account used for the purchase.

**Console steps** [S21] (documented):
1. In the Google Cloud console, open **Gemini Enterprise** and pick the app.
2. Click **Agents → Add agent**.
3. Under **Choose an agent type**, click **Add** for **Agents via Marketplace**.
4. Search by name or by semantic description, click the agent, then click **Next**.
5. Review the agent details, then click **Next**.
6. Enter the required authentication details, then click **Finish**. The DCR handshake runs at this point. [S10]

The overview page instead says customers "run a command to add it to Gemini Enterprise". [S1] (documented conflict)

**Admin controls that go with it** [S21] (documented):
- **Agent settings & config → Marketplace visibility.** Options: Only show accessible, Only show already integrated, Only show procured (default), Show all.
- **Agent settings & config → Procurement contacts.**
- **Procurements & integration requests.** Shows display name, user request count and status. Action: **Integrate & grant access**.
- **Review share request → Grant access**, for agents already purchased and integrated.
- **Delete** the agent.

**Sharing:** User permissions tab → Add user → User, Group, Principal, Workforce identity pool, or All users → assign a role. [S24] (documented)

**End user:** Agent Gallery → Marketplace section → **Request access**. On approval the user gets a bell notification, the agent appears in "From your organization", and `@agent_name` works. [S23] First use prompts for OAuth consent. [S10] (documented)

**What gets created in the tenant:**
- An `Agent` under `.../engines/{app}/assistants/default_assistant/agents/{id}` with `a2aAgentDefinition.jsonAgentCard`. [S26] (documented)
- `a2aAgentDefinition.cloudMarketplaceConfig.entitlement` (required, format `projects/{project}/entitlements/{entitlement}`) and the output-only `order` (`billingAccounts/{ba}/orders/{order}`). [S26] (documented)
- `sharingConfig.scope` (`RESTRICTED`, `ALL_USERS` or `PRIVATE`) and IAM grants. [S24][S26] (documented)
- An `authorizationConfig.agentAuthorization` pointing at an `Authorization` that holds the credentials returned by DCR. (inferred; not documented for the Marketplace path)
- App (engine) fields `marketplaceAgentVisibility` and `procurementContactEmails`. [S26] (documented)

**Launch stage** [S25] (documented): "Add agents from Google Cloud Marketplace" Preview, 2025-12-05. "Request access to Google Cloud Marketplace agents" Preview, 2026-04-20. Sharing, including Marketplace agents, GA, 2026-02-23.

## Private or test listings

- **Producer Portal access needs Google.** It depends on the Cloud Marketplace Project Info Form "provided by the Cloud Marketplace team". Vendor sign-up and the Marketplace Vendor Agreement are also required, and the blog says to nominate the agent through a Google representative. [S3][S6][S10] (documented)
- **Draft or preview:** Producer Portal has **Preview**. Submitting "doesn't publish it publicly immediately". Google validates the listing, then gives you a `gcloud` command to make it public. [S8] (documented) Whether a submitted but not-yet-public listing can be bought by chosen test accounts is unknown without Google.
- **Private offers:** they require the product to be "integrated with and listed on Cloud Marketplace", and must meet listing requirements. [S19][S20] Private-offer-only availability is a listing option, but it still passes through review. [S10] Some offers sit in "Pending Google Approval". [S20] (documented)
- **Test Billing Accounts** give a 100% discount for testing. They need Producer Portal access, and a pricing review approved for at least one product. [S17][S18] (documented)
- **SaaS codelab "DEMO" provider:** a real Procurement, Pub/Sub and Service Control sandbox with provider ID `DEMO-{project}`. [S16] It is enabled from Producer Portal, so it still needs Google onboarding. It is SaaS, not the AI-agent type, and its own page warns it "does not give a full product environment for testing". (documented)
- **Bottom line:** no documented path gives a working listing, offer, entitlement, or Google-initiated DCR call without Google's review. (documented by omission; unknown without Google whether an undocumented path exists)

## Demo mock: screens and steps

A mock step can still be backed by real Novu code: for example, Novu's own Pub/Sub topic with a synthetic `ENTITLEMENT_CREATION_REQUESTED` payload, or a JWT that Novu signs locally for the DCR endpoint. Google never produces those events in the sandbox, so the step stays a mock.

**Purchase (Billing Administrator)**

| Step | What the admin sees | Real in sandbox / mock |
|---|---|---|
| 1. Browse Agent Marketplace | Cloud Marketplace "Agent Marketplace" category with the Novu Discovery Agent tile | Mock |
| 2. Listing page | Title, description and skills (from the Agent Card), pricing plans, **Subscribe** | Mock |
| 3. Subscribe or accept private offer | Billing account picker, terms, confirm | Mock |
| 4. Entitlement approved | Order shown as active. Behind it: Pub/Sub, then `accounts:approve` and `entitlements:approve` | Mock (Novu handler can run on synthetic events) |
| 5. Go to Gemini Enterprise | **Go to Gemini Enterprise** button, then a project picker for the project linked to the billing account | Mock |

**Install (Discovery Engine Administrator, Google Cloud console)**

| Step | What the admin sees | Real in sandbox / mock |
|---|---|---|
| 6. Open app → Agents → **Add agent** | Gemini Enterprise app, Agents page | Real |
| 7. Choose agent type | Marketplace: **Agents via Marketplace**, then search and pick the Novu agent. Sandbox: **Custom agent via A2A** | Marketplace picker: mock. Custom A2A: real |
| 8. Review agent details | Marketplace: details read from the listing card. Sandbox: paste the Agent Card JSON, then **Preview agent details** | Real (different screen) |
| 9. Authentication details, then **Finish** | Marketplace: Google calls Novu's DCR endpoint and client credentials fill in. Sandbox: enter Client ID, Secret, Authorization URI, Token URI and Scopes, or use `authorizations.create` | DCR call: mock. Manual OAuth entry: real |
| 10. Agent listed | Agent row in the Agents list (created with `agents.create` and `jsonAgentCard`) | Real, without `cloudMarketplaceConfig` |

**Govern (Discovery Engine Administrator)**

| Step | What the admin sees | Real in sandbox / mock |
|---|---|---|
| 11. Share | User permissions → Add user → All users or a group → role | Real |
| 12. Marketplace visibility and procurement contacts | Agent settings & config panel | Controls are real. Novu will not appear under Marketplace. (inferred) |
| 13. Procurements & integration requests | Request count, **Integrate & grant access** | Mock |
| 14. Review share request for a Marketplace agent | **Review share request → Grant access** | Mock |

**Use (end user) and billing**

| Step | What the admin or user sees | Real in sandbox / mock |
|---|---|---|
| 15. Agent Gallery | Marketplace section with **Request access**, then bell notification | Mock |
| 16. Agent in "From your organization", `@mention` | The agent in the gallery and chat | Real |
| 17. First-use consent | OAuth sign-in and consent prompt | Real, if an authorization resource is set |
| 18. Billing and usage | Charges on the Cloud Billing invoice; hourly Service Control reports | Mock |
| 19. Cancel | `ENTITLEMENT_CANCELLED`, then Novu revokes the OAuth client and disables the org | Mock |

Do not try `agents.create` with a made-up `cloudMarketplaceConfig.entitlement`. How the API validates that field is unknown without Google.

## Open questions

All of these are unknown without Google.

**Listing and approval**
1. The Agent ScoreCard thresholds used for Agent Card validation (the guide is not public). [S2]
2. Whether Pattern 9 accepts a Novu API outside Google Cloud alongside a Discovery Agent on Cloud Run with Vertex AI Gemini. [S9]
3. Whether Gemini through AI Studio meets "Google foundation … models", or Vertex AI or Model Garden hosting is expected. [S1]
4. Whether a submitted but not-yet-public listing can be bought by test accounts, and whether the "run a command" install path exists. [S1][S8]

**Technical**
1. The DCR spec page: the extension URI returns 404, `sub` is undefined, errors are undocumented, and it is unclear whether DCR is mandatory when OAuth is used. [S10]
2. Which `protocolVersion` the validator accepts, given the example says `"1.0"` with a v0.3 shape. [S10][S22]
3. Whether AI agents need account linking through a frontend sign-up page. The docs conflict. [S1][S10]
4. How the Marketplace install fills in `authorizationConfig` and validates `cloudMarketplaceConfig.entitlement`. [S26]

## Sources

- S1 Offer AI agents through Cloud Marketplace: https://docs.cloud.google.com/marketplace/docs/partners/ai-agents
- S2 Add your AI agent's Agent Card: https://docs.cloud.google.com/marketplace/docs/partners/ai-agents/agent-card
- S3 Add your AI agent in Producer Portal: https://docs.cloud.google.com/marketplace/docs/partners/ai-agents/add-product
- S4 Add product details for your AI agent: https://docs.cloud.google.com/marketplace/docs/partners/ai-agents/product-details
- S5 Add your AI agent's pricing information: https://docs.cloud.google.com/marketplace/docs/partners/ai-agents/choose-pricing
- S6 Pricing models for AI agents: https://docs.cloud.google.com/marketplace/docs/partners/ai-agents/pricing-models
- S7 Integrate your AI agent with Cloud Marketplace: https://docs.cloud.google.com/marketplace/docs/partners/ai-agents/technical-integration
- S8 Publish your AI agent: https://docs.cloud.google.com/marketplace/docs/partners/ai-agents/publish
- S9 Requirements for Google Cloud Marketplace (hosting patterns 8 and 9): https://docs.cloud.google.com/marketplace/docs/partners/get-started
- S10 Google Cloud Blog, "Publish agents in Gemini Enterprise and Google Cloud Marketplace" (2026-07-07): https://cloud.google.com/blog/topics/developers-practitioners/publish-agents-in-gemini-enterprise-and-google-cloud-marketplace
- S11 Configure your app's backend: https://docs.cloud.google.com/marketplace/docs/partners/integrated-saas/backend-integration
- S12 Manage user accounts: https://docs.cloud.google.com/marketplace/docs/partners/integrated-saas/manage-user-accounts
- S13 Manage customer entitlements: https://docs.cloud.google.com/marketplace/docs/partners/integrated-saas/manage-entitlements
- S14 Configure usage reporting: https://docs.cloud.google.com/marketplace/docs/partners/integrated-saas/configure-usage-reports
- S15 Partner Procurement API discovery document (revision 20260922): https://cloudcommerceprocurement.googleapis.com/$discovery/rest?version=v1
- S16 SaaS Marketplace codelab: https://developers.google.com/codelabs/gcp-marketplace-saas and https://github.com/googlecodelabs/gcp-marketplace-integrated-saas
- S17 Test your SaaS product integration: https://docs.cloud.google.com/marketplace/docs/partners/integrated-saas/test-saas-product
- S18 Testing your published products: https://docs.cloud.google.com/marketplace/docs/partners/testing-products
- S19 Discover Private Offers: https://docs.cloud.google.com/marketplace/docs/partners/offers
- S20 Create a private offer: https://docs.cloud.google.com/marketplace/docs/partners/offers/create-private-offers
- S21 Gemini Enterprise, Add and manage A2A agents from Marketplace: https://docs.cloud.google.com/gemini/enterprise/docs/register-and-manage-marketplace-agents
- S22 Gemini Enterprise, Register and manage A2A agents: https://docs.cloud.google.com/gemini/enterprise/docs/register-and-manage-an-a2a-agent
- S23 Gemini Enterprise, Agent Gallery: https://docs.cloud.google.com/gemini/enterprise/docs/agent-gallery
- S24 Gemini Enterprise, Share agents: https://docs.cloud.google.com/gemini/enterprise/docs/share-custom-agents
- S25 Gemini Enterprise release notes: https://docs.cloud.google.com/gemini/enterprise/docs/release-notes
- S26 Discovery Engine v1alpha discovery document (revision 20260924): https://discoveryengine.googleapis.com/$discovery/rest?version=v1alpha
- S27 A2A v0.3.0 JSON schema: https://github.com/a2aproject/A2A/blob/v0.3.0/specification/json/a2a.json
- S28 A2A specification (latest, v1.0): https://github.com/a2aproject/A2A/blob/main/docs/specification.md
- S29 Service Control Operation reference: https://docs.cloud.google.com/service-infrastructure/docs/service-control/reference/rest/v1/Operation
