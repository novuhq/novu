import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAccessors } from "../utils/tool-accessors";
import { ToolFactory } from "../utils/tool-factory";

export function registerEnvironmentTools(server: McpServer, accessors: ToolAccessors) {
	ToolFactory.createGetTool(
		server,
		accessors,
		"get_environments",
		"Get all environments from your Novu application with their details and API keys. OAuth sessions default to Development: pass an environment's _id from here as the environmentId parameter on other tools to target another environment (e.g. Production), which environment-bound API keys ignore.",
		"/v1/environments",
		"fetched environments",
	);
}
