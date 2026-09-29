# NV-8865: What identity and tokens does the Discovery Agent get, and what can it call with them?

Legend: **[D]** documented (URL cited) · **[I]** inferred from documented facts · **[S]** undocumented, needs a sandbox test (NV-8871 / NV-8872). Numbers in brackets point to **Sources**. Researched 2026-09-29.

## Answer

1. **What arrives with each Gemini Enterprise call.** At most two credentials [D][1]:
   - `X-Serverless-Authorization`: a Google-signed ID token for the *customer's* Discovery Engine service agent. The audience is our agent URL.
   - `Authorization: Bearer <user token>`: sent only if the agent is registered with `authorizationConfig.agentAuthorization`.
   - No email or user header is documented. The user's access token is opaque, so we get the user's email only by introspecting it, and only if the `userinfo.email` scope was granted [D][16].
2. **Scopes are not restricted by Gemini Enterprise.** The authorization resource is plain server-side OAuth2 (`clientId`, `clientSecret`, `authorizationUri`, `tokenUri`, optional `scopes`) [D][3]. Google's docs show `cloud-platform` in use [D][1][8]. All `discoveryengine.*` and `agentregistry.*` scopes exist in the discovery documents [D][3][4][11].
3. **The narrowest set that covers all three calls is:** `openid email https://www.googleapis.com/auth/discoveryengine.serving.readwrite https://www.googleapis.com/auth/agentregistry.read-only` [I from D][4][5][6][11].
   - `discoveryengine.assist.readwrite` is **not** enough. The A2A proxy doesn't accept it [D][4][6].
4. **Calling as the user.** Scopes are only half of it; IAM decides the rest:
   - `streamAssist` needs `discoveryengine.assistants.assist`. The standard Gemini Enterprise User role already includes it [D][5][7].
   - Agent Registry search needs `roles/agentregistry.viewer` on the registry project. Gemini Enterprise users do **not** get it by default [D][12][13].
   - The A2A proxy's IAM permission isn't documented. It probably depends on the agent-level "Agent User" share [S].
5. **Recommendation for the Gemini Enterprise channel:** act as the user.
   - Register with `agentAuthorization`, using a Web OAuth client that the customer owns (user type Internal, so no Google verification is needed [D][22]), with the scopes above.
   - Use the Cloud Run ID token only to authenticate the caller and map the tenant.
6. **Recommendation for Slack:** a one-time "Sign in with Google" per Slack user.
   - Use the same customer-owned client plus a Novu redirect URI. Store the refresh token encrypted, and re-prompt in Slack on `invalid_grant` / `invalid_rapt`.
   - A service account is only acceptable for a degraded "recommend and show an Open link" mode. It breaks per-user visibility and audit.
   - Domain-wide delegation is not recommended.

## What the agent receives from Gemini Enterprise

### HTTP headers

| Header | Content | Status |
|---|---|---|
| `X-Serverless-Authorization: Bearer <ID token>` | Minted for `service-<CUSTOMER_PROJECT_NUMBER>@gcp-sa-discoveryengine.iam.gserviceaccount.com`, with `aud` set to the agent URL. Cloud Run's ingress uses it to check `roles/run.invoker`. | [D][1] |
| `Authorization: Bearer <user token>` | "OAuth 2.0 access token or ID token on behalf of the signed-in end user after they grant consent". Cloud Run passes it to the container unchanged. | [D][1] |
| Anything else (user email, tenant ID, locale) | Not documented. | [S] |

- The A2A spec says the server gets credentials only from HTTP headers declared through the Agent Card's security schemes, and it "MUST authenticate every incoming request" [D][26].
- `agentAuthorization` tokens are "passed to the agent as part of the request auth header". `toolAuthorizations` tokens (used on the ADK path) are "passed … as part of the request body" [D][3]. For ADK agents, the body token lands in `session.state[<authorization name>]` [D][27]. The A2A path uses `agentAuthorization`, so the user token comes in the header.
- If no authorization is configured, no user credential is passed at all [D][1].

### The Cloud Run ID token (`X-Serverless-Authorization`)

- **Claims** follow the service-account ID token format [D][16]:
  - `iss=https://accounts.google.com`
  - `aud=<agent URL>`
  - `azp` and `sub` = the service agent's unique ID
  - `email` = the Discovery Engine service agent address, with `email_verified`
  - `iat` / `exp`, valid for 1 hour
  - Service-account ID tokens never carry an `hd` claim.
- **Signature:** when this header is used, Cloud Run "removes the signature before passing the token to the user container" [D][14]. The app can read the claims but can't re-verify the token. It relies on Cloud Run's IAM check.
- **Cross-project setup [I]:** the Discovery Agent runs in *Novu's* project, so each customer's service agent must get `roles/run.invoker` on Novu's Cloud Run service. That is one IAM binding per customer at onboarding. Google's docs only show the same-project case [D][1].
- **Tenant mapping [I]:** the `email` claim encodes the customer's project number. That makes it a candidate key for mapping a request to a Novu organisation (input to NV-8876).
- **Without the IAM check:** if we run with `--no-invoker-iam-check` (a public service) [D][15], it's undocumented whether Gemini Enterprise still sends the header, and whether it arrives with the signature intact so we could verify it against Google's JWKS ourselves [S].

### The user token (`Authorization`)

- **How it is obtained [D][1]:**
  - An admin creates a *Web application* OAuth client with the redirect URIs `https://vertexaisearch.cloud.google.com/oauth-redirect` and `…/static/oauth/oauth.html`.
  - The admin registers an `authorizations` resource with `serverSideOauth2`.
  - The `authorizationUri` must use `response_type=code`, `access_type=offline`, `prompt=consent` and `include_granted_scopes=true`.
- **The user consents inside Gemini Enterprise** before the token is sent [D][1]. The Gemini Enterprise User role includes `discoveryengine.authorizations.storeUserAuthorization` [D][7].
- **Refresh:** Gemini Enterprise holds and refreshes the refresh token [I from D][1][3][7]. The agent only ever sees the access token. The client secret is "encrypted at rest" on Google's side [D][3].
- **Format:** Google user access tokens are opaque and expire after 1 hour [D][16]. Introspect them with `https://oauth2.googleapis.com/tokeninfo?access_token=…`. The response includes `aud` / `azp` (the OAuth client ID), `sub`, `scope`, `exp`, and `email` / `email_verified` **only if** `userinfo.email` was granted [D][16].
  - Key users by `sub`, not by email [D][17].
  - To validate a request, check that `aud`/`azp` equals the customer's registered client ID [I].
- **Access token or ID token?** Gemini Enterprise's docs say it may send either. When each happens isn't documented [S].
- **Workforce Identity Federation tenants:** Gemini Enterprise supports workforce pool principals [D][7], but this flow goes through `accounts.google.com`. Whether it works for federated users is untested [S].

## Authorization scopes

### Which scopes the authorization can request

- **Any scope the OAuth client can obtain.** The `scopes` field "overwrite[s] the scopes in the authorization uri" [D][3].
- **The endpoint can be a non-Google OAuth provider.** The URI fields are generic, and PKCE and basic authentication are optional [D][3].
- **`cloud-platform` is allowed:**
  - Google's docs *require* it when the A2A agent is hosted on Agent Runtime [D][1].
  - The Agent Registry import page uses it as its example [D][8].
- **`discoveryengine.*` scopes:** all four exist in v1, v1alpha and v1beta [D][4]: `discoveryengine.readwrite`, `discoveryengine.assist.readwrite`, `discoveryengine.serving.readwrite`, and `cloud_search.query`.
  - Nothing documented restricts them in an authorization. We haven't requested them through one yet [S].

### Which scope each call accepts (from the discovery documents)

| Call | Accepted scopes | Source |
|---|---|---|
| Agent Registry `agents.search` / `agents.list` (v1, v1alpha) | `agentregistry.read-only`, `agentregistry.read-write`, `cloud-platform`, `cloud-platform.read-only` | [D][11] |
| `assistants.streamAssist` (v1, v1alpha, v1beta) | `cloud-platform`, `discoveryengine.assist.readwrite`, `discoveryengine.readwrite`, `discoveryengine.serving.readwrite` | [D][4][5] |
| A2A proxy `…/agents/*/a2a/v1/message:send`, `message:stream`, `tasks.get`, `tasks.cancel`, `tasks.subscribe`, `card` (v1) | `cloud-platform`, `discoveryengine.readwrite`, `discoveryengine.serving.readwrite` (**not** `assist.readwrite`) | [D][4][6] |
| Identity (email, `sub`) | `openid email` / `userinfo.email` | [D][16][17] |

- **Recommended set:** `openid email discoveryengine.serving.readwrite agentregistry.read-only` [I].
- **Fallback:** `cloud-platform` is the single scope that covers everything [D][4][11]. It is much broader, and Workspace "Google Cloud session control" definitely applies to it (see Slack options) [D][18][19].
- **Sensitivity class:** Google doesn't publish whether these scopes are sensitive or restricted. The Cloud Console shows the class when a scope is added to the consent screen [D][23]. Check this on the Data Access page [S].

## Calling Agent Registry / A2A proxy / streamAssist as the user

| Target | IAM the user needs | Does per-user visibility hold? | Status |
|---|---|---|---|
| **Agent Registry search** `POST agentregistry.googleapis.com/v1/projects/*/locations/*/agents:search` | `agentregistry.agents.search`, through `roles/agentregistry.viewer` on the registry project. Neither Gemini Enterprise role includes any `agentregistry.*` permission. | No. The Registry API has **no agent-level IAM**: `agents` has no `getIamPolicy`, only `aiApplications` does. Anyone with viewer sees every agent in the project ("all accessible Agents"). | [D][11][12][13][7]; visibility [I] → [S] |
| **`streamAssist`** `POST discoveryengine…/assistants/default_assistant:streamAssist` | `discoveryengine.assistants.assist` on the assistant. Included in `roles/discoveryengine.agentspaceUser` (Gemini Enterprise User) and in Editor/Admin. | Runs as the user; sessions belong to the user. | [D][5][7][10]. Already worked in our sandbox as `adam@novu.co` (an Owner) [local evidence 29] |
| **A2A proxy** `POST discoveryengine…/agents/{id}/a2a/v1/message:stream` | Not listed on the REST page. The Gemini Enterprise User role has `agents.get` / `getAgentView` / `listAvailableAgentViews`. Agents are shared by granting the **Agent User** role to a user, group or all users. | Probably enforced through Agent User sharing. | [D][6][7][8]; permission and enforcement [S] |

Notes:

- **Licensing:** a user needs a Gemini Enterprise license to sign in to the app [D][9]. Whether API calls check the license too isn't documented [S].
- **Listing agents per user:**
  - `assistants.agents.list` returns only "Agents … which were created by the caller" [D][3], so it is **not** a per-user availability list.
  - `agents.listAvailableAgentViews` / `getAgentView` exist as IAM permissions [D][7] but have no method in the public v1, v1alpha or v1beta discovery documents (checked 2026-09-29, revision 20260924) [D][3][4].
- **Relaying to an agent that has its own `authorizationConfig`:** it's unknown whether the A2A proxy reuses the user's stored consent for the target agent, returns `auth-required`, or fails [S]. The A2A spec defines `auth-required` for secondary credentials [D][26].
- **Target agents on Agent Runtime:** these need a `cloud-platform` authorization on *their* registration [D][1]. That is the target's configuration, not ours [I].
- **Quota project:** whether calls made with a customer-client token bill to the customer's project, or need `X-Goog-User-Project`, is untested [S].

## Slack options

In Slack no Google identity comes with the message, so Novu has to get one.

| | **A. "Sign in with Google" once per Slack user** | **B. Service account as a bot** | **C. Domain-wide delegation (DWD)** |
|---|---|---|---|
| Mechanism | Web-server OAuth flow: `response_type=code`, `access_type=offline`, `prompt=consent`, Web application client [D][18][1] | A Novu-owned (or customer-created) service account granted roles in the customer project [D][7][25] | A service account impersonates any Workspace user after a super admin authorizes its client ID and scopes [D][25][20] |
| Scopes | Same as the Gemini Enterprise channel: `openid email discoveryengine.serving.readwrite agentregistry.read-only` [I] | `cloud-platform` (a service account's scope is effectively governed by IAM) [I] | Same set, requested with `sub=<user>` [I] |
| Roles | The user's own roles: Gemini Enterprise User, Agent User shares, `agentregistry.viewer` [D][7][8][13] | `roles/discoveryengine.agentspaceUser`, plus Agent User on each agent (if service accounts can be added there), plus `roles/agentregistry.viewer` [I from D][7][8][13] | The user's roles, same as A [I] |
| Can it call `streamAssist` / the A2A proxy on a Google-identity engine? | Yes, it's the same as the Gemini Enterprise path [D][5][6] | IAM accepts service accounts as principals [D][7]. Service accounts "don't consume" Gemini Enterprise licenses, and Google's own AlphaEvolve API guide uses service-account impersonation against a Gemini Enterprise engine [D][28]. Whether `streamAssist` or the proxy accept a service account on a GSUITE-identity engine is untested [S] | DWD tokens are documented as a token type [D][16], but their use against Discovery Engine is not documented [S] |
| Sees agents shared only with users | Yes (the user's own view) | No. It sees only what is shared with the service account itself. The console offers "user, group, or all users" [D][8]; service-account eligibility [S] | Yes, if it works [S] |
| Per-user audit and data | Preserved: audit logs and sessions belong to the user [I] | **Broken.** Every Slack user acts as one principal, and sessions and grounding data are the service account's, not the user's. That is a data-exposure risk [I] | Audit shows the impersonated user; DWD token `email` = the user [D][16] |
| Consent and verification | A customer-owned client with user type **Internal** needs no verification and has no unverified-app screen or 100-user cap [D][22][21]. A Novu-owned **External** client needs verification for sensitive or restricted scopes; unverified published apps get the warning screen and a 100-user cap [D][21][23][24]. Workspace admins may have to mark the client Trusted [D][20] | None | A super admin grants domain-wide authority. It can't be limited to certain users [D][25][20] |
| Token lifetime | Access token 1 hour [D][16]. Refresh token stops working when: the user revokes it, it goes unused for 6 months, the 100-per-user-per-client limit is exceeded, or an admin restricts the service. External apps in "Testing" get **7-day** refresh tokens [D][18]. **Google Cloud session control** applies to apps using `cloud-platform` (and "Google Cloud scopes"): refresh fails with `invalid_grant` / `invalid_rapt` after 1 to 24 hours unless the admin exempts Trusted apps [D][18][19][20] | Service-account access tokens last 1 hour and can't be revoked [D][16] | 1 hour, can't be revoked [D][16] |
| Storage | Novu stores the refresh token encrypted and refreshes per call. Google: "Save refresh tokens in secure long-term storage", and don't use user credentials for server-to-server jobs [D][18] | Nothing per user | A service-account key or impersonation chain in Novu [I] |
| Verdict | **Recommended** | Fallback only, for a "recommend + Open link" mode with no relay | **Not recommended**: domain-wide power, Workspace only, unverified |

Implementation notes for option A:

- **Linking identities:** link the Slack user ID to the Google `sub` taken from the ID token [D][17]. Use `hd` to check the Workspace domain [D][17].
- **Which OAuth client to use.** Two choices; this is a decision for NV-8875:
  - Reuse the customer-owned client that the admin already registered for Gemini Enterprise, adding Novu's redirect URI. Needs no verification, but means per-tenant setup and Novu holding the client secret.
  - Use a single Novu-owned client. Needs one verification (and CASA if any scope is restricted), but scales better for Marketplace.
- **Scope choice and session control:** whether session control also covers `discoveryengine.*` and `agentregistry.*` scopes, or only `cloud-platform`, is not stated [S]. That is another reason to avoid `cloud-platform`.

## Open questions for the sandbox

For NV-8871 / NV-8872:

1. **Headers:** dump every header Gemini Enterprise sends to our Cloud Run agent, both with and without `agentAuthorization`. Is there a user email header? Is the `Authorization` value an access token or an ID token? Does the ID token's `email` claim identify the customer's project number?
2. **Public service:** with `--no-invoker-iam-check`, is `X-Serverless-Authorization` still sent, and is its signature intact?
3. **Scopes in an authorization:** register one with `openid email discoveryengine.serving.readwrite agentregistry.read-only`. Does consent succeed? What sensitivity class does the Console show for these scopes? Do all three calls succeed with the forwarded token?
4. **Per-user permissions:** as a non-owner user who has only the Gemini Enterprise User role:
   - `streamAssist` works?
   - The A2A proxy to an agent that is shared vs. not shared with them: which error, and which permission is named?
   - Agent Registry search without `agentregistry.viewer`: 403?
   - Registry results: identical for every user who has viewer?
5. **Service account and DWD:** with a service account (and separately a DWD token), call `streamAssist` and the A2A proxy on the GSUITE-identity engine. Can a service account be granted Agent User? Is a license check applied? What `principalEmail` appears in the audit log?
6. **Nested authorization:** relay through the A2A proxy to a target agent that has its own `agentAuthorization`. Does the result reuse the user's consent, return `auth-required`, or fail?
7. **Session control:** enable Google Cloud session control (1 hour) in the test Workspace. Does a refresh token holding only `discoveryengine.*` + `agentregistry.*` scopes still refresh after the session expires?

## Sources

1. Register and manage A2A agents (Gemini Enterprise): https://docs.cloud.google.com/gemini/enterprise/docs/register-and-manage-an-a2a-agent
2. Register and manage ADK agents on Agent Runtime: https://docs.cloud.google.com/gemini/enterprise/docs/register-and-manage-an-adk-agent
3. Discovery Engine discovery document v1alpha (`Authorization`, `AuthorizationServerSideOAuth2`, `AuthorizationConfig` schemas; `assistants.agents.list`): https://discoveryengine.googleapis.com/$discovery/rest?version=v1alpha
4. Discovery Engine discovery document v1 (A2A proxy methods and scopes, `streamAssist` scopes); v1beta checked too: https://discoveryengine.googleapis.com/$discovery/rest?version=v1 · https://discoveryengine.googleapis.com/$discovery/rest?version=v1beta
5. `streamAssist` REST reference: https://docs.cloud.google.com/gemini/enterprise/docs/reference/rest/v1alpha/projects.locations.collections.engines.assistants/streamAssist
6. A2A proxy `message:send` REST reference: https://docs.cloud.google.com/gemini/enterprise/docs/reference/rest/v1/projects.locations.collections.engines.assistants.agents.a2a.v1.message/send
7. Gemini Enterprise IAM roles and permissions: https://docs.cloud.google.com/gemini/enterprise/docs/access-control
8. Import A2A agents from Agent Registry: https://docs.cloud.google.com/gemini/enterprise/docs/import-govern-agent-registry
9. Gemini Enterprise licenses: https://docs.cloud.google.com/gemini/enterprise/docs/licenses
10. Get answers from `streamAssist`: https://docs.cloud.google.com/gemini/enterprise/docs/get-answers-from-streamassist
11. Agent Registry `agents.search` REST reference and discovery document v1: https://docs.cloud.google.com/agent-registry/reference/rest/v1alpha/projects.locations.agents/search · https://agentregistry.googleapis.com/$discovery/rest?version=v1
12. Agent Registry: search for agents, tools and skills: https://docs.cloud.google.com/agent-registry/search-agents-and-tools
13. Agent Registry roles and permissions: https://docs.cloud.google.com/agent-registry/roles-permissions
14. Cloud Run service-to-service authentication: https://cloud.google.com/run/docs/authenticating/service-to-service
15. Cloud Run public access / Invoker IAM check: https://docs.cloud.google.com/run/docs/authenticating/public
16. Google Cloud token types: https://docs.cloud.google.com/docs/authentication/token-types
17. Google OpenID Connect: https://developers.google.com/identity/openid-connect/openid-connect
18. Using OAuth 2.0 to access Google APIs: https://developers.google.com/identity/protocols/oauth2
19. Set session length for Google Cloud services: https://support.google.com/a/answer/9368756
20. Additional considerations for Google Workspace: https://developers.google.com/identity/protocols/oauth2/production-readiness/google-workspace
21. OAuth app state overview: https://developers.google.com/identity/protocols/oauth2/production-readiness/overview
22. When verification is not needed: https://support.google.com/cloud/answer/13464323
23. OAuth App Verification Help Center: https://support.google.com/cloud/answer/13463073
24. Sensitive scope verification: https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification
25. OAuth 2.0 for server-to-server applications: https://developers.google.com/identity/protocols/oauth2/service-account
26. A2A protocol v0.3.0 specification, section 4: https://a2a-protocol.org/v0.3.0/specification/
27. GoogleCloudPlatform/iam-federation-tools, `geminienterprise_auth.py`: https://github.com/GoogleCloudPlatform/iam-federation-tools/blob/master/adk/geminienterprise_auth.py
28. AlphaEvolve environment and API access setup: https://docs.cloud.google.com/gemini/enterprise/docs/alphaevolve/developer-guide/environment-and-api-access-setup
29. Local evidence: `.pi-herdsman/sandbox/orchestration-flags-test.md` (`streamAssist` called successfully as `adam@novu.co`, 2026-09-29)
