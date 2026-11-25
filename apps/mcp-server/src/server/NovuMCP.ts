import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { REGION_DASHBOARD_URLS } from "../regions";
import type { ToolAccessors } from "../utils/tool-accessors";
import { FEEDBACK_SERVER_INFO } from "./feedback";
import { registerHostedTools } from "./hosted-tools";

/**
 * Per-session credentials handed off by the worker via `ctx.props` (the
 * McpAgent channel for exactly this — never URL params, which leak into logs).
 * The token may be a Clerk OAuth access token (oat_...) or a legacy Novu API key.
 * `apiUrl` is the Novu API base URL for this deployment's region; `region` is
 * the display label surfaced by `whoami`.
 */
export type NovuProps = {
	token: string | null;
	apiUrl: string;
	region: string;
};

export class NovuMCP extends McpAgent<Env, unknown, NovuProps> {
	server = new McpServer(FEEDBACK_SERVER_INFO);

	async init() {
		console.log("Novu MCP Server initializing...");
		this.registerAllTools();
		console.log("All Novu tools registered successfully");
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

	private registerAllTools() {
		registerHostedTools(this.server, {
			accessors: this.getAccessors(),
			feedbackSecretKey: this.env.CLERK_SECRET_KEY,
			getRegion: this.getRegion,
		});
	}
}
