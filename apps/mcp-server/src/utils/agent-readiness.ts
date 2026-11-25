import { asRecord, asString } from "./activity-format";
import { type AgentSummary, agentDashboardPath, compact, toAgentSummary } from "./agent-results";

/*
 * Whether an agent can reply on each of its channels, from what the API returns for the agent and its
 * channel links. The rules mirror the inbound path:
 * - an inactive agent replies nowhere (`AgentConfigResolver.resolve`);
 * - an agent or channel past the plan's limit posts an upgrade card instead (`PlanLimitGateService`),
 *   except a Human relay, which the gate skips;
 * - a turned-off Novu email inbox drops email (`AgentConfigResolver.resolve`);
 * - every agent but a Human relay or a managed one runs on its bridge (`RuntimeResolver`), and
 *   `BridgeExecutorService.resolveBridgeUrl` calls the local bridge while it is on, else the bridge URL
 *   the sender's context sets, else the agent's. A local bridge URL `new URL` can't read answers no
 *   one; without a usable agent bridge URL, only senders whose context sets one get an answer, so the
 *   channels can't be confirmed.
 * The agent arrives allowlisted (`toAgentSummary`), so credentials never reach this module and it
 * can't tell whether a provider is fully configured.
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

/** Why a bridge agent's channels can't be confirmed, by bridge status. */
const BRIDGE_CAVEATS: Partial<Record<AgentBridgeReadiness["status"], string>> = {
	"no bridge URL":
		"the agent has no bridge URL, so only senders whose context sets its own bridge URL get an answer",
	"unusable bridge URL":
		"the bridge URL can't be read or has no http:// or https:// scheme, so only senders whose context sets its own bridge URL get an answer",
};

export type AgentChannelReadiness = {
	channel: string;
	providerId?: string;
	integrationIdentifier: string;
	integrationName?: string;
	/** The dashboard's words: Connected once a first message arrived, otherwise In setup. */
	status: "Connected" | "In setup";
	/**
	 * ready: Connected and nothing blocks it; blocked: it won't reply; unconfirmed: nothing blocks it, but no message
	 * has arrived yet or only some senders get an answer.
	 */
	verdict: "ready" | "blocked" | "unconfirmed";
	reasons?: string[];
	/** The channel's page, as a path under `/env/<environment>`. */
	dashboardPath: string;
};

export type AgentBridgeReadiness =
	| { status: "managed by Novu" }
	| { status: "local bridge"; url: string }
	| { status: "bridge URL set"; url: string }
	| { status: "unusable bridge URL"; url: string }
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
	/** Only allowed senders, or senders matching the access rule, get a reply. */
	restrictedAccess?: true;
	channels?: AgentChannelReadiness[];
	/** The agent has more channels than `channels` lists, which holds the first page only. */
	moreChannels?: true;
	/** Set instead of `channels` when they couldn't be read. */
	channelsError?: string;
	notChecked: string[];
	/** The agent's channels tab, as a path under `/env/<environment>`. */
	dashboardPath: string;
};

function hasConnectedAt(value: unknown): boolean {
	const timestamp = typeof value === "string" ? Date.parse(value) : Number.NaN;

	return !Number.isNaN(timestamp) && timestamp > 0;
}

/** The dashboard's channel page, as a path under `/env/<environment>`. */
export function agentChannelDashboardPath(agentIdentifier: string, integrationIdentifier: string) {
	return `${agentDashboardPath(agentIdentifier)}/integrations/${encodeURIComponent(integrationIdentifier)}`;
}

/**
 * The bridge an agent's messages go to. As `RuntimeResolver` decides, every agent but a Human relay or a
 * managed one with its runtime runs on the bridge, including one saved before `runtime` existed. The dev
 * bridge wins while it is on.
 */
function toBridge(agent: AgentSummary): AgentBridgeReadiness | undefined {
	if (agent.runtime === "human_relay") return undefined;
	if (agent.runtime === "managed" && agent.managedRuntime) return { status: "managed by Novu" };
	if (usesLocalBridge(agent) && agent.devBridgeUrl)
		return toBridgeUrl("local bridge", agent.devBridgeUrl);

	return agent.bridgeUrl
		? toBridgeUrl("bridge URL set", agent.bridgeUrl)
		: { status: "no bridge URL" };
}

/** Whether the bridge executor calls the local bridge, as `config.devBridgeActive && config.devBridgeUrl` decides. */
function usesLocalBridge(agent: AgentSummary): boolean {
	return agent.devBridgeActive === true && agent.devBridgeUrl !== undefined;
}

/**
 * The bridge executor reads the URL with `new URL`, so one without an http(s) scheme can't be called.
 * `url` is already redacted, which keeps the scheme it was saved with.
 */
function toBridgeUrl(status: "local bridge" | "bridge URL set", url: string): AgentBridgeReadiness {
	return /^https?:\/\//i.test(url) ? { status, url } : { status: "unusable bridge URL", url };
}

function toChannel(
	agentIdentifier: string,
	link: Json,
	{
		agentBlocked,
		bridgeCaveat,
		humanRelay,
	}: { agentBlocked: boolean; bridgeCaveat?: string; humanRelay: boolean },
): AgentChannelReadiness | undefined {
	const integration = asRecord(link.integration);
	const integrationIdentifier = asString(integration?.identifier);
	if (!integration || !integrationIdentifier) return undefined;

	const providerId = asString(integration.providerId);
	const connected = hasConnectedAt(link.connectedAt);
	const blockers: string[] = [];
	const caveats: string[] = [];

	if (link.exceedsPlanLimit === true && !humanRelay) {
		blockers.push(
			"past the plan's active channel limit: it replies with an upgrade message instead",
		);
	}
	if (providerId && EMAIL_INBOX_PROVIDERS.has(providerId) && integration.active === false) {
		blockers.push("the email inbox is turned off");
	}
	if (bridgeCaveat) caveats.push(bridgeCaveat);
	if (!connected) caveats.push("no message has arrived on it yet");

	const blocked = agentBlocked || blockers.length > 0;
	const reasons = blocked ? blockers : caveats;

	return compact({
		channel: (providerId && CHANNEL_NAMES[providerId]) ?? providerId ?? "Unknown channel",
		dashboardPath: agentChannelDashboardPath(agentIdentifier, integrationIdentifier),
		integrationIdentifier,
		integrationName: asString(integration.name),
		providerId,
		reasons: reasons.length > 0 ? reasons : undefined,
		status: connected ? "Connected" : "In setup",
		verdict: blocked ? "blocked" : caveats.length > 0 ? "unconfirmed" : "ready",
	} satisfies AgentChannelReadiness);
}

export type AgentReadinessInput = {
	/** `GET /v1/agents/:identifier`, unwrapped; its `exceedsPlanLimit` is the runtime gate's own check. */
	agent: unknown;
	/** `GET /v1/agents/:identifier/integrations` rows; an error message when that read failed. */
	links: unknown[] | { error: string };
	/** That read has a next page. */
	moreLinks?: boolean;
};

/** The verdict, or `undefined` when the agent record has no identifier. */
export function buildAgentReadiness(input: AgentReadinessInput): AgentReadinessResult | undefined {
	const agent = toAgentSummary(input.agent);
	if (!agent) return undefined;

	const { identifier } = agent;
	const active = agent.active !== false;
	const humanRelay = agent.runtime === "human_relay";
	const bridge = toBridge(agent);
	const localBridgeBroken = bridge?.status === "unusable bridge URL" && usesLocalBridge(agent);
	const bridgeCaveat = bridge && !localBridgeBroken ? BRIDGE_CAVEATS[bridge.status] : undefined;
	const blockedBy: string[] = [];
	const access = agent.behavior?.subscriberAccess;

	if (!active) blockedBy.push("the agent is inactive");
	if (agent.exceedsPlanLimit === true && !humanRelay) {
		blockedBy.push("past the plan's agent limit: it replies with an upgrade message instead");
	}
	if (localBridgeBroken) {
		blockedBy.push(
			"the local bridge is on, and its URL can't be read or has no http:// or https:// scheme, so no message gets an answer",
		);
	}

	const result: AgentReadinessResult = {
		agent: compact({
			dashboardPath: agent.dashboardPath,
			identifier,
			name: agent.name,
			runtime: agent.runtime,
			status: active ? "Active" : "Inactive",
		}),
		blockedBy: blockedBy.length > 0 ? blockedBy : undefined,
		bridge,
		dashboardPath: `${agent.dashboardPath}/integrations`,
		notChecked: AGENT_READINESS_NOT_CHECKED,
		restrictedAccess: access === "restricted" || access === "rule" ? true : undefined,
	};

	if (Array.isArray(input.links)) {
		result.channels = input.links.flatMap((link) => {
			const record = asRecord(link);
			const channel =
				record &&
				toChannel(identifier, record, {
					agentBlocked: blockedBy.length > 0,
					bridgeCaveat,
					humanRelay,
				});

			return channel ? [channel] : [];
		});
		if (input.moreLinks) result.moreChannels = true;
	} else {
		result.channelsError = input.links.error;
	}

	return compact(result);
}
