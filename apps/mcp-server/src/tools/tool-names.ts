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
