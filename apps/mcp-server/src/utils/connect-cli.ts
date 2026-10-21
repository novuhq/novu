export const AGENT_ONBOARDING_PLAYBOOK_URL = "https://novu.co/agents.md";

const NOVU_CLOUD_API_URL = "https://api.novu.co";
const NOVU_STAGING_API_URL = "https://api.novu-staging.co";

function normalizeApiUrl(apiUrl: string | null | undefined): string {
	return (apiUrl ?? "").replace(/\/$/, "");
}

function isNovuStagingApiUrl(apiUrl: string | null | undefined): boolean {
	return normalizeApiUrl(apiUrl) === NOVU_STAGING_API_URL;
}

function isNovuLocalApiUrl(apiUrl: string | null | undefined): boolean {
	const normalized = normalizeApiUrl(apiUrl);
	if (!normalized) {
		return false;
	}

	try {
		const hostname = new URL(normalized).hostname;

		return hostname === "localhost" || hostname === "127.0.0.1";
	} catch {
		return false;
	}
}

function connectPackageTag(apiUrl?: string | null): "latest" | "rc" {
	return isNovuStagingApiUrl(apiUrl) || isNovuLocalApiUrl(apiUrl) ? "rc" : "latest";
}

function connectTargetFlags(apiUrl?: string | null): string[] {
	if (isNovuStagingApiUrl(apiUrl)) {
		return ["--region staging"];
	}

	const normalized = normalizeApiUrl(apiUrl);
	if (normalized && normalized !== NOVU_CLOUD_API_URL) {
		return [`--api-url ${normalized}`];
	}

	return [];
}

export function buildConnectCliCommand(input: {
	apiUrl: string;
	channel?: string;
	identifier: string;
}): string {
	const parts = [
		`npx novu@${connectPackageTag(input.apiUrl)} connect`,
		"--ci",
		`--agent-identifier ${input.identifier}`,
		...connectTargetFlags(input.apiUrl),
	];

	if (input.channel) {
		parts.push(`--channel ${input.channel}`);
	}

	return parts.join(" \\\n  ");
}

export function buildConnectAgentOverlay(input: {
	apiUrl: string;
	channel?: string;
	identifier: string;
	name: string;
}): string {
	const command = buildConnectCliCommand(input);
	const channelLine = input.channel
		? `Channel is already chosen: pass --channel ${input.channel} as shown below.`
		: "No channel was specified. Follow the playbook channel picker (Step M1 / B1) before running connect.";

	return [
		"I'm signed in to the Novu dashboard, so use dashboard login (not keyless mode).",
		`This environment already has agent "${input.name}" (identifier: ${input.identifier}). Do not create another agent.`,
		`Follow ${AGENT_ONBOARDING_PLAYBOOK_URL} for questions, --ci, and channel handoff.`,
		`You MUST pass --agent-identifier ${input.identifier}. You MUST omit --keyless and --secret-key.`,
		channelLine,
		"Draft command:",
		command,
		"If you cannot run a terminal, tell the user to connect the channel in the Novu dashboard for this agent. Do not collect Slack, Telegram, or other channel tokens in MCP.",
	].join("\n\n");
}
