import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAccessors } from "../utils/tool-accessors";
import { ToolFactory } from "../utils/tool-factory";

export function registerEnvironmentTools(server: McpServer, accessors: ToolAccessors) {
	ToolFactory.createGetTool(
		server,
		accessors,
		"get_environments",
		"Get all environments from your Novu application with their details and API keys. Use an environment's _id as the environmentId parameter on other tools to run them against that environment (e.g. Production instead of the default Development).",
		"/v1/environments",
		"fetched environments",
	);
}
