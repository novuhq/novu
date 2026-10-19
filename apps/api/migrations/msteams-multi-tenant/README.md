# MS Teams multi-tenant — re-consent runbook

This is an operational runbook, not a database migration. The multi-tenant MS Teams changes are
backward compatible, so there is nothing to back-fill in MongoDB:

- `ChannelEndpoint.endpoint.tenantId` (MS Teams user endpoints) is **optional**. Existing endpoints
  without it keep working: notification delivery falls back to the linked admin-consent
  connection's `workspace.id` (the home tenant), exactly as before.
- New connections/endpoints created after this change record the user's actual Azure AD tenant,
  which may be an external customer tenant.

## Why a re-consent is needed (per integration, Azure-side only)

Integrations onboarded before this change created their Entra app registration with
`signInAudience: 'AzureADMyOrg'` (single tenant). New integrations are created with
`signInAudience: 'AzureADMultipleOrgs'` (multi tenant). Switching an existing app to multi-tenant
invalidates prior admin consent, so it cannot be flipped silently or in bulk from Novu's side — it
requires action in the owner's Azure tenant and re-consent in each consuming tenant.

There is intentionally **no automated script** that rewrites customer Azure app registrations.

## To upgrade an existing integration for cross-tenant distribution

Performed by the Novu user who owns the integration (the bot's home tenant admin):

1. In Azure Portal → App registrations → the bot app → Authentication, set
   **Supported account types** to **Accounts in any organizational directory (Multitenant)**
   (equivalently `signInAudience: AzureADMultipleOrgs`). The Application (client) ID and Tenant ID
   do not change. Re-running Novu Quick Setup for a fresh integration also produces a multi-tenant
   app automatically.
2. Re-grant admin consent in the home tenant (the existing connection already stores the home
   tenant in `workspace.id`, so no Novu data change is required).
3. Keep the Azure **Bot** resource as **Single Tenant** — multi-tenant Azure Bot creation was
   deprecated by Microsoft after 2025-07-31; cross-tenant messaging works once the Teams app is
   installed and consented in the customer tenant.

## Per customer tenant (handled by the onboarding UI, no migration)

For each external customer:

1. The customer admin installs the Teams app package (shared ZIP) in their own Teams admin center.
2. The customer admin grants consent for the app in their tenant via
   `https://login.microsoftonline.com/common/adminconsent?client_id=<APP_ID>`.
3. The customer's users connect; the bot is installed for them and the endpoint records that
   customer's tenant id.

## Rollback

No data changes to roll back. Reverting the code restores single-tenant authorize/consent
behavior; endpoints that recorded a `tenantId` remain valid (the field is simply ignored by the
old delivery path, which falls back to the connection's `workspace.id`).
