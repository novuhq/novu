import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerActivityTools } from "../tools/activity";
import { registerAgentTools } from "../tools/agents";
import { registerAuthTools } from "../tools/auth";
import { registerConversationTools } from "../tools/conversations";
import { registerEnvironmentTools } from "../tools/environments";
import { registerIntegrationTools } from "../tools/integrations";
import { registerNotificationTools } from "../tools/notifications";
import { registerPreferenceTools } from "../tools/preferences";
import { registerSubscriberReachabilityTool } from "../tools/subscriber-reachability";
import { registerSubscriberTools } from "../tools/subscribers";
import { registerWorkflowTools } from "../tools/workflows";
import type { ToolAccessors } from "../utils/tool-accessors";
import { registerFeedbackTool } from "./feedback";

/** What registering the hosted tools needs beyond the server. */
export type HostedToolsContext = {
	accessors: ToolAccessors;
	getRegion: () => string;
	/** Clerk secret for `submit_feedback`; without it the tool isn't registered. */
	feedbackSecretKey: string | undefined;
};

/**
 * Registers every tool the hosted server lists, in `tools/list` order. `NovuMCP` and the tests both call this, so the
 * smoke snapshot and the size budget in `test/tool-schemas.spec.ts` check the list clients get. No Worker-only imports
 * here: the tests run it outside the Workers runtime.
 */
export function registerHostedTools(server: McpServer, context: HostedToolsContext): void {
	const { accessors } = context;
	registerAuthTools(server, accessors, context.getRegion);
	registerAgentTools(server, accessors);
	registerConversationTools(server, accessors);
	registerWorkflowTools(server, accessors);
	registerEnvironmentTools(server, accessors);
	registerSubscriberTools(server, accessors);
	registerSubscriberReachabilityTool(server, accessors);
	registerNotificationTools(server, accessors);
	registerActivityTools(server, accessors);
	registerPreferenceTools(server, accessors);
	registerIntegrationTools(server, accessors);
	registerFeedbackTool(server, context.feedbackSecretKey);
}
