import { WORKFLOW_STEP_TOOL_NAMES } from "./workflow-steps";

/** Every tool `registerWorkflowTools` registers, by public MCP name. */
export const WORKFLOW_TOOL_NAMES = {
	BULK_TRIGGER_WORKFLOW: "bulk_trigger_workflow",
	CANCEL_TRIGGERED_EVENT: "cancel_triggered_event",
	CREATE_WORKFLOW: "create_workflow",
	DELETE_WORKFLOW: "delete_workflow",
	GET_WORKFLOW: "get_workflow",
	GET_WORKFLOWS: "get_workflows",
	TRIGGER_WORKFLOW: "trigger_workflow",
	UPDATE_WORKFLOW: "update_workflow",
	...WORKFLOW_STEP_TOOL_NAMES,
} as const;

export type WorkflowToolName = (typeof WORKFLOW_TOOL_NAMES)[keyof typeof WORKFLOW_TOOL_NAMES];

/** Every tool `registerActivityTools` registers, by public MCP name. All are read-only. */
export const ACTIVITY_TOOL_NAMES = [
	"get_workflow_runs",
	"get_workflow_run",
	"get_trigger_requests",
] as const;

export type ActivityToolName = (typeof ACTIVITY_TOOL_NAMES)[number];

/** Every tool `registerAgentTools` registers, by public MCP name. */
export const AGENT_TOOL_NAMES = {
	CONNECT_AGENT: "connect_agent",
	CREATE_AGENT: "create_agent",
	GET_AGENT: "get_agent",
	GET_AGENTS: "get_agents",
	UPDATE_AGENT: "update_agent",
} as const;

export type AgentToolName = (typeof AGENT_TOOL_NAMES)[keyof typeof AGENT_TOOL_NAMES];

/** Every tool `registerConversationTools` registers, by public MCP name. All are read-only. */
export const CONVERSATION_TOOL_NAMES = [
	"get_conversations",
	"get_conversation_activities",
] as const;

export type ConversationToolName = (typeof CONVERSATION_TOOL_NAMES)[number];

/** Every tool `registerAgentReadinessTool` registers, by public MCP name. All are read-only. */
export const AGENT_READINESS_TOOL_NAMES = ["get_agent_readiness"] as const;

export type AgentReadinessToolName = (typeof AGENT_READINESS_TOOL_NAMES)[number];

/** Every tool `registerSubscriberReachabilityTool` registers, by public MCP name. All are read-only. */
export const SUBSCRIBER_REACHABILITY_TOOL_NAMES = ["get_subscriber_reachability"] as const;

export type SubscriberReachabilityToolName = (typeof SUBSCRIBER_REACHABILITY_TOOL_NAMES)[number];

/** Every tool `registerUsageTools` registers, by public MCP name. All are read-only. */
export const USAGE_TOOL_NAMES = ["get_usage"] as const;

export type UsageToolName = (typeof USAGE_TOOL_NAMES)[number];

/** Every tool `registerIntegrationTools` registers, by public MCP name. */
export const INTEGRATION_TOOL_NAMES = {
	DELETE_INTEGRATION: "delete_integration",
	GET_ACTIVE_INTEGRATIONS: "get_active_integrations",
	GET_INTEGRATION_SETUP_LINK: "get_integration_setup_link",
	GET_INTEGRATIONS: "get_integrations",
	SET_ACTIVITY_TRACKING: "set_activity_tracking",
	SET_PRIMARY_INTEGRATION: "set_primary_integration",
	UPDATE_INTEGRATION: "update_integration",
} as const;

export type IntegrationToolName =
	(typeof INTEGRATION_TOOL_NAMES)[keyof typeof INTEGRATION_TOOL_NAMES];
