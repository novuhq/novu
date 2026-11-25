import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { REGION_DASHBOARD_URLS } from "../regions";
import type { ToolAccessors } from "../utils/tool-accessors";
import { createNovuMcpServer, getSessionToolsets, type ToolsetName } from "./toolsets";

/**
 * Per-session credentials handed off by the worker via `ctx.props` (the
 * McpAgent channel for exactly this — never URL params, which leak into logs).
 * The token may be a Clerk OAuth access token (oat_...) or a legacy Novu API key.
 * `apiUrl` is the Novu API base URL for this deployment's region; `region` is
 * the display label surfaced by `whoami`. `toolsets` is what the current
 * request's URL asks for; the session's own toolsets are the ones
 * `getSessionToolsets` stored on its first start, so read those instead.
 */
export type NovuProps = {
	token: string | null;
	apiUrl: string;
	region: string;
	toolsets?: ToolsetName[];
};

export class NovuMCP extends McpAgent<Env, unknown, NovuProps> {
	// Built in `init`: the server instructions depend on the session's toolsets.
	server!: McpServer;

	async init() {
		console.log("Novu MCP Server initializing...");
		const toolsets = await getSessionToolsets(this.ctx.storage, this.props?.toolsets);
		this.server = createNovuMcpServer(toolsets, {
			accessors: this.getAccessors(),
			feedbackSecretKey: this.env.CLERK_SECRET_KEY,
			getRegion: this.getRegion,
		});
		console.log(`Novu tools registered: ${toolsets.join(", ")}`);
	}

	/** Update session credentials without re-running tool registration. */
	async updateSessionProps(props: NovuProps): Promise<void> {
		await this.ctx.storage.put("props", props);
		this.props = props;
	}

	private getAccessors = (): ToolAccessors => ({
		getApiUrl: () => this.props?.apiUrl ?? "https://api.novu.co",
		getDashboardUrl: () => REGION_DASHBOARD_URLS[this.getRegion()] ?? REGION_DASHBOARD_URLS.us,
		getToken: () => this.props?.token ?? null,
	});

	private getRegion = (): string => {
		return this.props?.region ?? "us";
	};
}
