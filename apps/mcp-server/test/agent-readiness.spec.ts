import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TOOLSETS } from "../src/server/toolsets";
import type { AgentReadinessResult } from "../src/utils/agent-readiness";
import { type Routes, respond, stubApi } from "./fake-api";
import { callTool, connectAllTools, textOf, tokenAccessors } from "./support";

const SECRETS = [
	"bridge-query-secret",
	"bridge-password",
	"dev-query-secret",
	"system-prompt-secret",
	"xoxb-integration-secret",
	"org-secret-id",
];

const AGENT_PATH = "/v1/agents/support-bot";
const LIST_PATH = "/v1/agents?identifier=support-bot&limit=100";
const LINKS_PATH = "/v1/agents/support-bot/integrations?limit=100";

function rawAgent(overrides: Record<string, unknown> = {}) {
	return {
		_organizationId: "org-secret-id",
		active: true,
		behavior: { subscriberAccess: "open" },
		identifier: "support-bot",
		managedRuntime: { providerId: "anthropic", systemPrompt: "system-prompt-secret" },
		name: "Support bot",
		runtime: "managed",
		...overrides,
	};
}

function link(providerId: string, identifier: string, overrides: Record<string, unknown> = {}) {
	const { integration, ...rest } = overrides;

	return {
		_id: `link-${identifier}`,
		connectedAt: null,
		integration: {
			_id: `int-${identifier}`,
			active: true,
			channel: providerId.includes("email") ? "email" : "chat",
			credentials: { botToken: "xoxb-integration-secret" },
			identifier,
			name: identifier,
			providerId,
			...(integration as Record<string, unknown> | undefined),
		},
		...rest,
	};
}

function routes(overrides: Routes = {}): Routes {
	return {
		[AGENT_PATH]: rawAgent(),
		[LINKS_PATH]: respond(200, {
			data: [
				link("slack", "slack-1", { connectedAt: "2026-11-20T10:00:00.000Z" }),
				link("whatsapp-business", "whatsapp-1"),
			],
			next: null,
			previous: null,
		}),
		[LIST_PATH]: respond(200, {
			data: [rawAgent({ identifier: "support-bot-old" }), rawAgent()],
			next: null,
			previous: null,
		}),
		...overrides,
	};
}

async function readiness(routeOverrides: Routes = {}) {
	stubApi(routes(routeOverrides));
	const client = await connectAllTools(tokenAccessors("key"), "us", [
		...DEFAULT_TOOLSETS,
		"agent-setup",
	]);
	const result = await callTool(client, "get_agent_readiness", { identifier: "support-bot" });
	const text = textOf(result);
	for (const secret of SECRETS) {
		expect(text, `leaked ${secret}`).not.toContain(secret);
	}

	return {
		result,
		text,
		value: result.isError ? undefined : (JSON.parse(text) as AgentReadinessResult),
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("get_agent_readiness", () => {
	it("says which channels are ready, in the dashboard's words, with a link to each", async () => {
		const { value } = await readiness();

		expect(value).toEqual({
			agent: {
				dashboardPath: "/agents/support-bot",
				identifier: "support-bot",
				name: "Support bot",
				runtime: "managed",
				status: "Active",
			},
			bridge: { status: "managed by Novu" },
			channels: [
				{
					channel: "Slack",
					dashboardPath: "/agents/support-bot/integrations/slack-1",
					integrationIdentifier: "slack-1",
					integrationName: "slack-1",
					providerId: "slack",
					status: "Connected",
					verdict: "ready",
				},
				{
					channel: "WhatsApp",
					dashboardPath: "/agents/support-bot/integrations/whatsapp-1",
					integrationIdentifier: "whatsapp-1",
					integrationName: "whatsapp-1",
					providerId: "whatsapp-business",
					reasons: ["no message has arrived on it yet"],
					status: "In setup",
					verdict: "unconfirmed",
				},
			],
			dashboardPath: "/agents/support-bot/integrations",
			notChecked: expect.arrayContaining([expect.stringContaining("WhatsApp sender number")]),
		});
	});

	it("blocks every channel of an inactive agent or one past the plan's agent limit", async () => {
		const inactive = await readiness({ [AGENT_PATH]: rawAgent({ active: false }) });
		const overLimit = await readiness({
			[LIST_PATH]: respond(200, { data: [rawAgent({ exceedsPlanLimit: true })] }),
		});

		expect(inactive.value?.agent.status).toBe("Inactive");
		expect(inactive.value?.blockedBy).toEqual(["the agent is inactive"]);
		expect(inactive.value?.channels?.map((channel) => channel.verdict)).toEqual([
			"blocked",
			"blocked",
		]);
		expect(overLimit.value?.blockedBy).toEqual([
			"past the plan's agent limit: it replies with an upgrade message instead",
		]);
	});

	it("ignores another agent's plan limit when the list matches by substring", async () => {
		const { value } = await readiness({
			[LIST_PATH]: respond(200, {
				data: [
					rawAgent({ exceedsPlanLimit: true, identifier: "support-bot-old" }),
					rawAgent(),
				],
			}),
		});

		expect(value?.blockedBy).toBeUndefined();
	});

	it("blocks a self-hosted agent without a bridge URL, and shows a set bridge without its secrets", async () => {
		const noBridge = await readiness({ [AGENT_PATH]: rawAgent({ runtime: "self-hosted" }) });
		const withBridge = await readiness({
			[AGENT_PATH]: rawAgent({
				bridgeUrl:
					"https://user:bridge-password@bridge.acme.dev/api/novu?token=bridge-query-secret",
				runtime: "self-hosted",
			}),
		});
		const local = await readiness({
			[AGENT_PATH]: rawAgent({
				bridgeUrl: "https://bridge.acme.dev/api/novu",
				devBridgeActive: true,
				devBridgeUrl: "https://tunnel-1.novu.dev/api/novu?key=dev-query-secret",
				runtime: "self-hosted",
			}),
		});

		expect(noBridge.value?.bridge).toEqual({ status: "no bridge URL" });
		expect(noBridge.value?.blockedBy).toEqual([
			"no bridge URL is set, so messages get no answer from the agent",
		]);
		expect(withBridge.value?.bridge).toEqual({
			status: "bridge URL set",
			url: "https://bridge.acme.dev/api/novu",
		});
		expect(local.value?.bridge).toEqual({
			status: "local bridge",
			url: "https://tunnel-1.novu.dev/api/novu",
		});
	});

	it("blocks a channel past the plan's channel limit and a turned-off email inbox, not other inactive integrations", async () => {
		const { value } = await readiness({
			[LINKS_PATH]: respond(200, {
				data: [
					link("telegram", "telegram-1", {
						connectedAt: "2026-11-20T10:00:00.000Z",
						exceedsPlanLimit: true,
					}),
					link("novu-email-agent", "email-1", {
						connectedAt: "2026-11-20T10:00:00.000Z",
						integration: { active: false },
					}),
					link("slack", "slack-1", {
						connectedAt: "2026-11-20T10:00:00.000Z",
						integration: { active: false },
					}),
				],
			}),
		});

		expect(
			value?.channels?.map(({ channel, reasons, verdict }) => ({
				channel,
				reasons,
				verdict,
			})),
		).toEqual([
			{
				channel: "Telegram",
				reasons: [
					"past the plan's active channel limit: it replies with an upgrade message instead",
				],
				verdict: "blocked",
			},
			{ channel: "Email", reasons: ["the email inbox is turned off"], verdict: "blocked" },
			{ channel: "Slack", reasons: undefined, verdict: "ready" },
		]);
	});

	it("reports reads it couldn't make instead of an empty answer", async () => {
		const { value } = await readiness({
			[LINKS_PATH]: respond(403, { message: "Forbidden" }),
			[LIST_PATH]: respond(500, { message: "boom" }),
		});

		expect(value?.channels).toBeUndefined();
		expect(value?.channelsError).toBe("couldn't check channels: status 403");
		expect(value?.planLimitError).toBe("couldn't check the agent's plan limit: status 500");
	});

	it("fails with the status when the agent isn't found", async () => {
		const { result, text } = await readiness({
			[AGENT_PATH]: respond(404, { message: "Not found" }),
		});

		expect(result.isError).toBe(true);
		expect(text).toContain('Agent "support-bot" was not found in this environment');
		expect(result.structuredContent).toEqual({
			error: expect.objectContaining({ status: 404 }),
		});
	});

	it("is only listed for sessions that ask for the agent-setup toolset", async () => {
		const plain = await connectAllTools(tokenAccessors("key"));
		const withToolset = await connectAllTools(tokenAccessors("key"), "us", ["agent-setup"]);

		const plainNames = (await plain.listTools()).tools.map((tool) => tool.name);
		const toolsetNames = (await withToolset.listTools()).tools.map((tool) => tool.name);

		expect(plainNames).not.toContain("get_agent_readiness");
		expect(toolsetNames).toContain("get_agent_readiness");
	});
});
