export type DcrRequestBody = Record<string, unknown>;

/** Pre-registered MCP OAuth client (static DCR response when env client ID is set). */
export interface McpOAuthClient {
	resolveClientId(env: Env): string | null;
	matches(body: DcrRequestBody): boolean;
	buildRegistration(clientId: string): Record<string, unknown>;
}
