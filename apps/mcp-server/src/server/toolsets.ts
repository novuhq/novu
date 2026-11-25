import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_CORS_HEADERS } from "../oauth/context";
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
import { FEEDBACK_SERVER_INFO, registerFeedbackTool } from "./feedback";

/*
 * The hosted server's tools come in toolsets, picked with the `toolsets` query parameter of the server URL, as on
 * GitHub's and Datadog's MCP servers. Clients load every listed tool's schema into each conversation, so the default
 * list is held to a size budget (`test/tool-schemas.spec.ts`) and new tools ship in opt-in toolsets
 * (`default: false`). `whoami`, `get_environments` and `submit_feedback` are in every selection.
 */

/**
 * Every toolset: whether a plain server URL loads it, and what it covers, as the server instructions name it. Clients
 * keep these names in their server URLs, and an unknown name is a 400, so don't rename or remove one: keep the old
 * name accepted as an alias.
 */
export const TOOLSETS = {
	activity: { default: true, description: "workflow runs, trigger requests and notifications" },
	agents: { default: true, description: "agents and their conversations" },
	integrations: { default: true, description: "provider integrations" },
	subscribers: {
		default: true,
		description: "subscribers, their preferences and which channels reach them",
	},
	workflows: { default: true, description: "create, edit, delete and trigger workflows" },
} as const satisfies Record<string, { default: boolean; description: string }>;

export type ToolsetName = keyof typeof TOOLSETS;

const TOOLSET_NAMES = Object.keys(TOOLSETS) as ToolsetName[];

export const DEFAULT_TOOLSETS: ToolsetName[] = TOOLSET_NAMES.filter(
	(name) => TOOLSETS[name].default,
);

/** What registering a toolset needs beyond the server. */
export type ToolsetContext = {
	accessors: ToolAccessors;
	getRegion: () => string;
	/** Clerk secret for `submit_feedback`; without it the tool isn't registered. */
	feedbackSecretKey: string | undefined;
};

/**
 * Every tool module, in the order `tools/list` has always listed them, with its toolset (`null`: in every selection).
 * Keeping the order keeps the default list byte for byte what clients had before toolsets.
 */
const TOOL_MODULES: ReadonlyArray<{
	toolset: ToolsetName | null;
	register: (server: McpServer, context: ToolsetContext) => void;
}> = [
	{ register: (s, c) => registerAuthTools(s, c.accessors, c.getRegion), toolset: null },
	{ register: (s, c) => registerAgentTools(s, c.accessors), toolset: "agents" },
	{ register: (s, c) => registerConversationTools(s, c.accessors), toolset: "agents" },
	{ register: (s, c) => registerWorkflowTools(s, c.accessors), toolset: "workflows" },
	{ register: (s, c) => registerEnvironmentTools(s, c.accessors), toolset: null },
	{ register: (s, c) => registerSubscriberTools(s, c.accessors), toolset: "subscribers" },
	{
		register: (s, c) => registerSubscriberReachabilityTool(s, c.accessors),
		toolset: "subscribers",
	},
	{ register: (s, c) => registerNotificationTools(s, c.accessors), toolset: "activity" },
	{ register: (s, c) => registerActivityTools(s, c.accessors), toolset: "activity" },
	{ register: (s, c) => registerPreferenceTools(s, c.accessors), toolset: "subscribers" },
	{ register: (s, c) => registerIntegrationTools(s, c.accessors), toolset: "integrations" },
	{ register: (s, c) => registerFeedbackTool(s, c.feedbackSecretKey), toolset: null },
];

/**
 * The toolsets a `toolsets` query parameter asks for: comma-separated names, plus `default` (the toolsets a plain URL
 * loads) and `all`. Missing or empty means `default`. An unknown name is an error that lists the valid ones.
 */
export function resolveToolsets(
	value: string | null | undefined,
): { toolsets: ToolsetName[] } | { error: string } {
	const requested = (value ?? "")
		.split(",")
		.map((name) => name.trim().toLowerCase())
		.filter(Boolean);
	if (requested.length === 0) {
		return { toolsets: DEFAULT_TOOLSETS };
	}

	const selected = new Set<ToolsetName>();
	for (const name of requested) {
		if (name === "all") {
			for (const toolset of TOOLSET_NAMES) selected.add(toolset);
		} else if (name === "default") {
			for (const toolset of DEFAULT_TOOLSETS) selected.add(toolset);
		} else if (isToolsetName(name)) {
			selected.add(name);
		} else {
			return {
				error: `Unknown toolset "${name}". Use a comma-separated list of: ${[...TOOLSET_NAMES, "default", "all"].join(", ")}.`,
			};
		}
	}

	return { toolsets: TOOLSET_NAMES.filter((toolset) => selected.has(toolset)) };
}

/**
 * The toolsets a request's URL asks for, or the 400 to answer it with. `?toolsets=a,b` and `?toolsets=a&toolsets=b`
 * ask for the same toolsets. A CORS preflight never gets the 400, so a browser client sees the error on the request
 * itself rather than a CORS failure.
 */
export function readRequestedToolsets(
	request: Request,
): { toolsets: ToolsetName[] | undefined } | { rejection: Response } {
	const resolved = resolveToolsets(
		new URL(request.url).searchParams.getAll("toolsets").join(","),
	);
	if ("toolsets" in resolved) {
		return { toolsets: resolved.toolsets };
	}
	if (request.method === "OPTIONS") {
		return { toolsets: undefined };
	}

	return {
		rejection: new Response(
			JSON.stringify({ error: "invalid_toolsets", error_description: resolved.error }),
			{ headers: { "Content-Type": "application/json", ...MCP_CORS_HEADERS }, status: 400 },
		),
	};
}

function isToolsetName(name: string): name is ToolsetName {
	return (TOOLSET_NAMES as string[]).includes(name);
}

/**
 * The server instructions for a session with `toolsets`: which toolsets it left out and how to add one, so the model
 * can tell the user. Undefined when the session has every toolset.
 */
export function buildToolsetInstructions(toolsets: readonly ToolsetName[]): string | undefined {
	const missing = TOOLSET_NAMES.filter((name) => !toolsets.includes(name));
	if (missing.length === 0) {
		return undefined;
	}

	const loaded = toolsets.length > 0 ? toolsets.join(", ") : "none";
	const notLoaded = missing.map((name) => `${name} (${TOOLSETS[name].description})`).join("; ");
	const example = [...toolsets, missing[0]].join(",");

	return `Novu's tools come in toolsets. Loaded in this session: ${loaded}. Not loaded: ${notLoaded}. When a request needs a toolset that isn't loaded, tell the user to add it to the toolsets query parameter of the Novu MCP server URL and reconnect, for example ?toolsets=${example} (?toolsets=all loads every toolset).`;
}

/** A hosted server with the tools of `toolsets`, plus the ones every selection has. */
export function createNovuMcpServer(
	toolsets: readonly ToolsetName[],
	context: ToolsetContext,
): McpServer {
	const instructions = buildToolsetInstructions(toolsets);
	const server = new McpServer(FEEDBACK_SERVER_INFO, instructions ? { instructions } : undefined);
	for (const module of TOOL_MODULES) {
		if (module.toolset === null || toolsets.includes(module.toolset)) {
			module.register(server, context);
		}
	}

	return server;
}

type SessionStorage = {
	get<T>(key: string): Promise<T | undefined>;
	put<T>(key: string, value: T): Promise<void>;
};

const SESSION_TOOLSETS_KEY = "toolsets";

/**
 * The toolsets of a session: the ones it started with, kept in its storage. A woken Durable Object starts again with
 * the props of whichever request woke it, so reading them each time would let the tool list change mid-session.
 * Sessions that started before toolsets existed get `requested`, then keep it.
 */
export async function getSessionToolsets(
	storage: SessionStorage,
	requested: readonly ToolsetName[] | undefined,
): Promise<ToolsetName[]> {
	const stored = await storage.get<string[]>(SESSION_TOOLSETS_KEY);
	if (stored) {
		// A toolset renamed or removed since the session started is dropped.
		return stored.filter(isToolsetName);
	}

	const toolsets = [...(requested ?? DEFAULT_TOOLSETS)];
	await storage.put(SESSION_TOOLSETS_KEY, toolsets);

	return toolsets;
}
