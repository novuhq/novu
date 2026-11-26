import axios from 'axios';

const MS_GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const ORG_CATALOG_FILTER = "distributionMethod eq 'organization'";
/** Stops paging through a tenant's org catalog after this many pages. */
const MAX_CATALOG_PAGES = 10;

type OrgCatalogAppDefinition = {
  publishingState?: string | null;
  bot?: { id?: string | null } | null;
};

type OrgCatalogApp = {
  id: string;
  appDefinitions?: OrgCatalogAppDefinition[] | null;
};

type OrgCatalogPage = {
  value: OrgCatalogApp[];
  '@odata.nextLink'?: string;
};

/** Submitted (awaiting admin approval) and rejected definitions can't be installed. */
function isPublishedDefinition(definition: OrgCatalogAppDefinition): boolean {
  return !definition.publishingState || definition.publishingState === 'published';
}

/**
 * Returns the catalog IDs (`teamsApp.id`) of the org-published Teams apps that use this bot.
 *
 * Novu's automatic Azure setup publishes the manifest with `id` set to the bot's Entra app ID, so
 * `externalId` matches. Apps built in the Teams Developer Portal get a manifest ID of their own and
 * carry the bot's app ID only in `bots[].botId`, which Graph returns as `appDefinitions[].bot.id`.
 * Graph doesn't document filtering on the bot ID, so that lookup lists the org catalog with the bot
 * expanded, matches here and stops at the first page with a match.
 *
 * Only `distributionMethod eq 'organization'` apps with a published definition count, so sideloaded
 * copies and submissions still waiting for admin approval are ignored.
 * Needs the AppCatalog.Read.All application permission. Graph errors reach the caller.
 */
export async function findOrgCatalogTeamsAppIds(graphToken: string, botAppId: string): Promise<string[]> {
  const headers = { Authorization: `Bearer ${graphToken}` };
  const manifestIdFilter = `externalId eq '${botAppId.replace(/'/g, "''")}' and ${ORG_CATALOG_FILTER}`;

  const manifestIdMatches = await axios.get<OrgCatalogPage>(
    `${MS_GRAPH_BASE_URL}/appCatalogs/teamsApps?$filter=${encodeURIComponent(manifestIdFilter)}&$expand=appDefinitions`,
    { headers, timeout: 10_000 }
  );
  const publishedManifestIdMatches = manifestIdMatches.data.value.filter(
    (app) => !app.appDefinitions?.length || app.appDefinitions.some(isPublishedDefinition)
  );

  if (publishedManifestIdMatches.length > 0) {
    return publishedManifestIdMatches.map((app) => app.id);
  }

  const wantedBotId = botAppId.toLowerCase();
  let pageUrl: string | undefined =
    `${MS_GRAPH_BASE_URL}/appCatalogs/teamsApps?$filter=${encodeURIComponent(ORG_CATALOG_FILTER)}` +
    `&$expand=${encodeURIComponent('appDefinitions($expand=bot)')}`;

  for (let page = 0; pageUrl && page < MAX_CATALOG_PAGES; page += 1) {
    const response = await axios.get<OrgCatalogPage>(pageUrl, { headers, timeout: 10_000 });
    const botIdMatches = response.data.value.filter((app) =>
      app.appDefinitions?.some(
        (definition) => isPublishedDefinition(definition) && definition.bot?.id?.toLowerCase() === wantedBotId
      )
    );

    // Stop at the first page with a match, so an error on a later page can't lose it.
    if (botIdMatches.length > 0) {
      return botIdMatches.map((app) => app.id);
    }

    // Follow Graph's own paging only; never send the token anywhere else.
    const nextLink = response.data['@odata.nextLink'];
    pageUrl = nextLink?.startsWith(`${MS_GRAPH_BASE_URL}/`) ? nextLink : undefined;
  }

  return [];
}
