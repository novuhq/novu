import { MCP_SERVERS } from '@novu/shared';

export type CatalogProjection = { externalId: string; name: string; url: string };

export type ProjectableMcpRow = {
  _id?: string;
  mcpId: string;
};

/**
 * Minimal logger surface used by `projectMcpRowsToCatalog`. Compatible with
 * `PinoLogger` from `@novu/application-generic` (which accepts an object
 * payload as the first argument and an optional message as the second).
 */
type Warner = { warn: (obj: object, msg?: string) => void };

/**
 * Project a list of `agent_mcp_server` rows onto the `{ externalId, name, url }`
 * shape consumed by the runtime provider config.
 *
 * Rows whose `mcpId` is no longer present in `MCP_SERVERS` (e.g. removed from
 * the catalog while a tenant still has an enablement row) are filtered out and
 * a single `warn` is emitted so the inconsistency is observable. The drop is
 * silent at the HTTP boundary because legacy rows must not block a healthy
 * runtime sync; a follow-up cleanup migration is expected to disable them.
 */
export function projectMcpRowsToCatalog<TRow extends ProjectableMcpRow>(
  rows: TRow[],
  logger: Warner | undefined,
  context: { agentId: string; useCase: string }
): CatalogProjection[] {
  const projections: CatalogProjection[] = [];
  const orphanMcpIds: string[] = [];

  for (const row of rows) {
    const catalog = MCP_SERVERS.find((entry) => entry.id === row.mcpId);

    if (!catalog) {
      orphanMcpIds.push(row.mcpId);
      continue;
    }

    // `externalId` uses the stable catalog id (e.g. 'slack'), not the display
    // name. The provider relies on this value for identity matching on
    // subsequent diffs/upserts; using `catalog.name` would break that
    // invariant if a catalog row is ever renamed or two providers ship the
    // same display name.
    projections.push({ externalId: row.mcpId, name: catalog.name, url: catalog.url });
  }

  if (orphanMcpIds.length > 0 && logger) {
    logger.warn(
      { agentId: context.agentId, useCase: context.useCase, orphanMcpIds },
      `Dropping ${orphanMcpIds.length} agent_mcp_server row(s) with mcpIds no longer in MCP_SERVERS catalog. ` +
        'Rows remain persisted but will not project onto the runtime provider.'
    );
  }

  return projections;
}
