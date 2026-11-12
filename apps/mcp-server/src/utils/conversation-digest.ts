const CONTENT_CAP = 240;
const OUTPUT_CAP = 400;

type ActivityRecord = Record<string, unknown>;

type PaginatedActivities = {
	data: ActivityRecord[];
	next: string | null;
	previous: string | null;
	totalCount?: number;
};

function asRecord(value: unknown): ActivityRecord | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}

	return value as ActivityRecord;
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function truncate(value: string, cap: number): string {
	if (value.length <= cap) {
		return value;
	}

	return `${value.slice(0, cap)}…`;
}

function stringifyUnknown(value: unknown, cap: number): string {
	if (typeof value === "string") {
		return truncate(value, cap);
	}

	try {
		return truncate(JSON.stringify(value), cap);
	} catch {
		return "[unserializable]";
	}
}

export function unwrapActivityList(payload: unknown): PaginatedActivities {
	const root = asRecord(payload);
	if (!root) {
		return { data: [], next: null, previous: null };
	}

	const rows = Array.isArray(root.data) ? root.data : [];
	const data = rows.filter((row): row is ActivityRecord => asRecord(row) !== null);

	return {
		data,
		next: asString(root.next) ?? null,
		previous: asString(root.previous) ?? null,
		totalCount: typeof root.totalCount === "number" ? root.totalCount : undefined,
	};
}

function readToolData(activity: ActivityRecord): ActivityRecord | null {
	return asRecord(activity.toolData);
}

function readLifecycle(activity: ActivityRecord): ActivityRecord | null {
	const direct = asRecord(activity.lifecycle);
	if (direct) {
		return direct;
	}

	const richContent = asRecord(activity.richContent);

	return asRecord(richContent?.lifecycle);
}

function readMcpConnection(activity: ActivityRecord): ActivityRecord | null {
	const richContent = asRecord(activity.richContent);

	return asRecord(richContent?.mcpConnection);
}

function formatActivityLine(activity: ActivityRecord): string {
	const time = asString(activity.createdAt) ?? "";
	const type = asString(activity.type) ?? "unknown";
	const senderType = asString(activity.senderType);
	const content = asString(activity.content);
	const parts = [time, type];

	if (senderType && type === "message") {
		parts.push(senderType);
	}

	if (content) {
		parts.push(truncate(content.replace(/\s+/g, " "), CONTENT_CAP));
	}

	const toolData = readToolData(activity);
	if (toolData) {
		const toolBits: string[] = [];
		if (asString(toolData.toolName)) toolBits.push(`tool=${toolData.toolName}`);
		if (asString(toolData.toolCallId)) toolBits.push(`call=${toolData.toolCallId}`);
		if (asString(toolData.approvalId)) toolBits.push(`approval=${toolData.approvalId}`);
		if (typeof toolData.approved === "boolean") toolBits.push(`approved=${toolData.approved}`);
		if (toolData.output !== undefined)
			toolBits.push(`output=${stringifyUnknown(toolData.output, OUTPUT_CAP)}`);
		if (toolBits.length > 0) {
			parts.push(toolBits.join(" "));
		}
	}

	const lifecycle = readLifecycle(activity);
	if (lifecycle) {
		const lifeBits: string[] = [];
		if (asString(lifecycle.outcome)) lifeBits.push(`outcome=${lifecycle.outcome}`);
		if (asString(lifecycle.finishReason))
			lifeBits.push(`finishReason=${lifecycle.finishReason}`);
		if (asString(lifecycle.code)) lifeBits.push(`code=${lifecycle.code}`);
		if (asString(lifecycle.message))
			lifeBits.push(truncate(String(lifecycle.message), CONTENT_CAP));
		if (lifeBits.length > 0) {
			parts.push(lifeBits.join(" "));
		}
	}

	const signalData = asRecord(activity.signalData);
	if (signalData?.type) {
		parts.push(`signal=${signalData.type}`);
	}

	const mcpConnection = readMcpConnection(activity);
	if (mcpConnection) {
		const mcpBits: string[] = [];
		if (asString(mcpConnection.displayName)) mcpBits.push(`mcp=${mcpConnection.displayName}`);
		else if (asString(mcpConnection.mcpId)) mcpBits.push(`mcp=${mcpConnection.mcpId}`);
		if (asString(mcpConnection.actionId)) mcpBits.push(`action=${mcpConnection.actionId}`);
		if (asString(mcpConnection.status)) mcpBits.push(`status=${mcpConnection.status}`);
		if (asString(mcpConnection.message))
			mcpBits.push(truncate(String(mcpConnection.message), CONTENT_CAP));
		if (mcpBits.length > 0) {
			parts.push(mcpBits.join(" "));
		}
	}

	return parts.filter(Boolean).join(" | ");
}

function isDeniedToolOutput(output: unknown): boolean {
	if (output === "execution-denied") {
		return true;
	}

	if (typeof output === "string" && output.includes("execution-denied")) {
		return true;
	}

	const record = asRecord(output);

	return record?.status === "execution-denied" || record?.error === "execution-denied";
}

export function diagnoseActivities(activities: ActivityRecord[]): string[] {
	const findings: string[] = [];
	const approvalIdsWithDecision = new Set<string>();
	const mcpActionIdsWithResult = new Set<string>();

	for (const activity of activities) {
		if (activity.type === "tool_approval_decision") {
			const approvalId = asString(readToolData(activity)?.approvalId);
			if (approvalId) {
				approvalIdsWithDecision.add(approvalId);
			}
		}

		if (activity.type === "mcp_connection_result") {
			const actionId = asString(readMcpConnection(activity)?.actionId);
			if (actionId) {
				mcpActionIdsWithResult.add(actionId);
			}
		}
	}

	for (const activity of activities) {
		const type = asString(activity.type);
		const toolData = readToolData(activity);
		const lifecycle = readLifecycle(activity);

		if (type === "run_error") {
			const message =
				asString(lifecycle?.message) ?? asString(activity.content) ?? "unknown error";
			const code = asString(lifecycle?.code);
			findings.push(code ? `Run error (${code}): ${message}` : `Run error: ${message}`);
		}

		if (type === "run_finish") {
			const outcome = asString(lifecycle?.outcome);
			if (outcome && outcome !== "completed") {
				const finishReason = asString(lifecycle?.finishReason);
				findings.push(
					finishReason
						? `Run finished with outcome "${outcome}" (finishReason=${finishReason})`
						: `Run finished with outcome "${outcome}"`,
				);
			}
		}

		if (type === "tool_approval_request") {
			const approvalId = asString(toolData?.approvalId);
			if (approvalId && !approvalIdsWithDecision.has(approvalId)) {
				const toolName = asString(toolData?.toolName) ?? "unknown tool";
				findings.push(
					`Waiting on human approval for ${toolName} (approvalId=${approvalId}) — no matching decision in this page`,
				);
			}
		}

		if (type === "tool_approval_decision" && toolData?.approved === false) {
			const toolName =
				asString(toolData.toolName) ?? asString(toolData.approvalId) ?? "a tool";
			findings.push(`Tool approval denied for ${toolName}`);
		}

		if (type === "tool_result" && isDeniedToolOutput(toolData?.output)) {
			const toolName = asString(toolData?.toolName) ?? "unknown tool";
			findings.push(`Tool result marked execution-denied for ${toolName}`);
		}

		if (type === "mcp_connection_request") {
			const connection = readMcpConnection(activity);
			const actionId = asString(connection?.actionId);
			if (actionId && !mcpActionIdsWithResult.has(actionId)) {
				const name =
					asString(connection?.displayName) ??
					asString(connection?.mcpId) ??
					"unknown MCP server";
				findings.push(
					`MCP OAuth connection requested for ${name} (actionId=${actionId}) with no matching result in this page`,
				);
			}
		}
	}

	return findings;
}

export function formatConversationActivitiesDigest(
	payload: unknown,
	input: { conversationId: string; verbose?: boolean },
): string {
	if (input.verbose) {
		return `Successfully fetched activities for ${input.conversationId}:\n\n${JSON.stringify(payload, null, 2)}`;
	}

	const list = unwrapActivityList(payload);
	const findings = diagnoseActivities(list.data);
	const header =
		findings.length > 0
			? [
					`Diagnosis (this page only, ${list.data.length} activities${list.totalCount != null ? `, totalCount=${list.totalCount}` : ""}):`,
					...findings.map((finding) => `- ${finding}`),
				].join("\n")
			: `No blocking issues detected on this page (${list.data.length} activities${list.totalCount != null ? `, totalCount=${list.totalCount}` : ""}).`;

	const timeline =
		list.data.length === 0
			? "(no activities)"
			: list.data.map((activity) => formatActivityLine(activity)).join("\n");

	const cursors = [`next: ${list.next ?? "null"}`, `previous: ${list.previous ?? "null"}`].join(
		"\n",
	);

	return [
		`Successfully fetched activities for ${input.conversationId}.`,
		header,
		"Timeline:",
		timeline,
		cursors,
	].join("\n\n");
}

export function formatConversationList(payload: unknown, input: { agentId?: string }): string {
	const root = asRecord(payload);
	const rows = Array.isArray(root?.data) ? root.data : [];
	const count = rows.length;
	const lines = [`Successfully fetched conversations (${count} on this page).`];

	if (input.agentId && count === 0) {
		lines.push(
			`Warning: agentId "${input.agentId}" matched no conversations. The API returns an empty list both when the agent has none and when the identifier is unknown — call get_agents to confirm the slug.`,
		);
	}

	lines.push(JSON.stringify(payload, null, 2));

	return lines.join("\n\n");
}
