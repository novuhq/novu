import { submitFeedbackTool } from "@clerk/mcp-tools/feedback";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const FEEDBACK_SERVER_INFO = { name: "Novu MCP Server", version: "1.0.0" };

/**
 * Registers Clerk's `submit_feedback` tool, which agents call once per task to
 * report a missing, broken or confusing tool. Reports land in the Clerk
 * Dashboard of the instance that owns `secretKey`.
 *
 * Hosted only: it lives in `src/server`, not `src/tools`, so the in-process
 * Copilot build never gets it. Skipped when the secret is unset, so local dev
 * and self-hosted deployments don't advertise a tool that can't deliver.
 */
export function registerFeedbackTool(server: McpServer, secretKey: string | undefined): void {
	const key = secretKey?.trim();
	if (!key) {
		return;
	}

	server.registerTool(...submitFeedbackTool({ secretKey: key, server: FEEDBACK_SERVER_INFO }));
}
