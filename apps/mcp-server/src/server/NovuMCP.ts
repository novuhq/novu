import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
// Import all tool registration functions
import { registerAgentTools } from "../tools/agents";
import { registerAuthTools } from "../tools/auth";
import { registerConversationTools } from "../tools/conversations";
import { registerEnvironmentTools } from "../tools/environments";
import { registerIntegrationTools } from "../tools/integrations";
import { registerNotificationTools } from "../tools/notifications";
import { registerPreferenceTools } from "../tools/preferences";
import { registerSubscriberTools } from "../tools/subscribers";
import { registerWorkflowTools } from "../tools/workflows";
import type { ToolAccessors } from "../utils/tool-accessors";

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
	server = new McpServer({
		name: "Novu MCP Server",
		version: "1.0.0",
	});

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
		getToken: () => this.props?.token ?? null,
	});

	private getRegion = (): string => {
		return this.props?.region ?? "us";
	};

	private registerAllTools() {
		const accessors = this.getAccessors();
		registerAuthTools(this.server, accessors, this.getRegion);
		registerAgentTools(this.server, accessors);
		registerConversationTools(this.server, accessors);
		registerWorkflowTools(this.server, accessors);
		registerEnvironmentTools(this.server, accessors);
		registerSubscriberTools(this.server, accessors);
		registerNotificationTools(this.server, accessors);
		registerPreferenceTools(this.server, accessors);
		registerIntegrationTools(this.server, accessors);
	}
}
