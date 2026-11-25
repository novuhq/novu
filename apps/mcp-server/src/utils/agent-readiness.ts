import { agentDashboardPath, redactUrl } from "./agent-results";

/*
 * Whether an agent can reply on each of its channels, from what the API returns for the agent, its
 * plan usage and its channel links. The rules mirror the inbound path:
 * - an inactive agent replies nowhere (`AgentConfigResolver.resolve`);
 * - an agent or channel past the plan's limit posts an upgrade card instead (`PlanLimitGateService`);
 * - a turned-off Novu email inbox drops email (`AgentConfigResolver.resolve`);
 * - a self-hosted agent without a bridge URL gets no answer (`BridgeExecutorService.resolveBridgeUrl`).
 * Credentials never reach this module, so it can't tell whether a provider is fully configured.
 */

type Json = Record<string, unknown>;

/** The Novu email inbox providers, whose integration `active` flag turns the agent's email off. */
const EMAIL_INBOX_PROVIDERS = new Set(["novu-email-agent", "agent-email-inbox"]);

/** Channel names as the dashboard shows them. */
const CHANNEL_NAMES: Record<string, string> = {
	"agent-email-inbox": "Email",
	msteams: "Microsoft Teams",
	"novu-email-agent": "Email",
	"novu-web-chat": "Web chat",
	"photon-imessage": "iMessage",
	sendblue: "iMessage",
	slack: "Slack",
	telegram: "Telegram",
	"whatsapp-business": "WhatsApp",
};

/** What the tool can't see, said once so the answer doesn't overclaim. */
export const AGENT_READINESS_NOT_CHECKED = [
	"provider credentials and setup inside the provider (such as a WhatsApp sender number)",
	"whether the bridge answers",
	"bridge URLs a context sets for itself",
	"the plan's limit on new conversations",
];

export type AgentChannelReadiness = {
	channel: string;
	providerId?: string;
	integrationIdentifier: string;
	integrationName?: string;
	/** The dashboard's words: Connected once a first message arrived, otherwise In setup. */
	status: "Connected" | "In setup";
	/** ready: Connected and nothing blocks it; blocked: it won't reply; unconfirmed: no message has arrived yet. */
	verdict: "ready" | "blocked" | "unconfirmed";
	reasons?: string[];
	/** The channel's page, as a path under `/env/<environment>`. */
	dashboardPath: string;
};

export type AgentBridgeReadiness =
	| { status: "managed by Novu" }
	| { status: "local bridge"; url?: string }
	| { status: "bridge URL set"; url?: string }
	| { status: "no bridge URL" };

export type AgentReadinessResult = {
	agent: {
		identifier: string;
		name?: string;
		/** The dashboard's words. */
		status: "Active" | "Inactive";
		runtime?: string;
		dashboardPath: string;
	};
	/** Why the agent replies on no channel at all. */
	blockedBy?: string[];
	bridge?: AgentBridgeReadiness;
	/** Only allowed senders get a reply. */
	restrictedAccess?: true;
	channels?: AgentChannelReadiness[];
	/** Set instead of `channels` when they couldn't be read. */
	channelsError?: string;
	/** Set when the agent's plan limit couldn't be read. */
	planLimitError?: string;
	notChecked: string[];
	/** The agent's channels tab, as a path under `/env/<environment>`. */
	dashboardPath: string;
};

function asRecord(value: unknown): Json | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Json)
		: undefined;
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function hasConnectedAt(value: unknown): boolean {
	const timestamp = typeof value === "string" ? Date.parse(value) : Number.NaN;

	return !Number.isNaN(timestamp) && timestamp > 0;
}

/** The dashboard's channel page, as a path under `/env/<environment>`. */
export function agentChannelDashboardPath(agentIdentifier: string, integrationIdentifier: string) {
	return `${agentDashboardPath(agentIdentifier)}/integrations/${encodeURIComponent(integrationIdentifier)}`;
}

function toBridge(agent: Json): AgentBridgeReadiness | undefined {
	const runtime = asString(agent.runtime);
	if (runtime === "managed") return { status: "managed by Novu" };
	if (runtime !== "self-hosted") return undefined;

	const devUrl = redactUrl(agent.devBridgeUrl);
	if (agent.devBridgeActive === true && devUrl) return { status: "local bridge", url: devUrl };

	const url = redactUrl(agent.bridgeUrl);

	return url ? { status: "bridge URL set", url } : { status: "no bridge URL" };
}

function toChannel(
	agentIdentifier: string,
	link: Json,
	agentBlocked: boolean,
): AgentChannelReadiness | undefined {
	const integration = asRecord(link.integration);
	const integrationIdentifier = asString(integration?.identifier);
	if (!integration || !integrationIdentifier) return undefined;

	const providerId = asString(integration.providerId);
	const connected = hasConnectedAt(link.connectedAt);
	const reasons: string[] = [];

	if (link.exceedsPlanLimit === true) {
		reasons.push(
			"past the plan's active channel limit: it replies with an upgrade message instead",
		);
	}
	if (providerId && EMAIL_INBOX_PROVIDERS.has(providerId) && integration.active === false) {
		reasons.push("the email inbox is turned off");
	}

	let verdict: AgentChannelReadiness["verdict"] = connected ? "ready" : "unconfirmed";
	if (agentBlocked || reasons.length > 0) verdict = "blocked";
	if (verdict === "unconfirmed") reasons.push("no message has arrived on it yet");

	const channel: AgentChannelReadiness = {
		channel: (providerId && CHANNEL_NAMES[providerId]) ?? providerId ?? "Unknown channel",
		dashboardPath: agentChannelDashboardPath(agentIdentifier, integrationIdentifier),
		integrationIdentifier,
		integrationName: asString(integration.name),
		providerId,
		reasons: reasons.length > 0 ? reasons : undefined,
		status: connected ? "Connected" : "In setup",
		verdict,
	};

	return Object.fromEntries(
		Object.entries(channel).filter(([, entry]) => entry !== undefined),
	) as AgentChannelReadiness;
}

export type AgentReadinessInput = {
	/** `GET /v1/agents/:identifier`, unwrapped. */
	agent: unknown;
	/** Whether the agent is past the plan's agent limit, from its `GET /v1/agents` row, or why that read failed. */
	planLimit: { exceeded: boolean } | { error: string };
	/** `GET /v1/agents/:identifier/integrations` rows; an error message when that read failed. */
	links: unknown[] | { error: string };
};

/** The verdict, or `undefined` when the agent record has no identifier. */
export function buildAgentReadiness(input: AgentReadinessInput): AgentReadinessResult | undefined {
	const agent = asRecord(input.agent);
	const identifier = asString(agent?.identifier);
	if (!agent || !identifier) return undefined;

	const planLimitError = "error" in input.planLimit ? input.planLimit.error : undefined;
	const active = agent.active !== false;
	const bridge = toBridge(agent);
	const blockedBy: string[] = [];

	if (!active) blockedBy.push("the agent is inactive");
	if ("exceeded" in input.planLimit && input.planLimit.exceeded) {
		blockedBy.push("past the plan's agent limit: it replies with an upgrade message instead");
	}
	if (bridge?.status === "no bridge URL") {
		blockedBy.push("no bridge URL is set, so messages get no answer from the agent");
	}

	const result: AgentReadinessResult = {
		agent: {
			dashboardPath: agentDashboardPath(identifier),
			identifier,
			name: asString(agent.name),
			runtime: asString(agent.runtime),
			status: active ? "Active" : "Inactive",
		},
		blockedBy: blockedBy.length > 0 ? blockedBy : undefined,
		bridge,
		dashboardPath: `${agentDashboardPath(identifier)}/integrations`,
		notChecked: AGENT_READINESS_NOT_CHECKED,
		planLimitError,
		restrictedAccess:
			asRecord(agent.behavior)?.subscriberAccess === "restricted" ? true : undefined,
	};

	if (Array.isArray(input.links)) {
		result.channels = input.links.flatMap((link) => {
			const record = asRecord(link);
			const channel = record && toChannel(identifier, record, blockedBy.length > 0);

			return channel ? [channel] : [];
		});
	} else {
		result.channelsError = input.links.error;
	}

	return Object.fromEntries(
		Object.entries(result).filter(([, entry]) => entry !== undefined),
	) as AgentReadinessResult;
}
