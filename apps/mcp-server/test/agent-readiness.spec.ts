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

function selfHosted(overrides: Record<string, unknown> = {}) {
	return rawAgent({ managedRuntime: undefined, runtime: "self-hosted", ...overrides });
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

const CONNECTED = "2026-11-20T10:00:00.000Z";

function routes(overrides: Routes = {}): Routes {
	return {
		[AGENT_PATH]: rawAgent(),
		[LINKS_PATH]: respond(200, {
			data: [
				link("slack", "slack-1", { connectedAt: CONNECTED }),
				link("whatsapp-business", "whatsapp-1"),
			],
			next: null,
			previous: null,
		}),
		...overrides,
	};
}

async function callReadiness() {
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

async function readiness(routeOverrides: Routes = {}) {
	stubApi(routes(routeOverrides));

	return callReadiness();
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
		const overLimit = await readiness({ [AGENT_PATH]: rawAgent({ exceedsPlanLimit: true }) });

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

	it("blocks an agent on the bridge without a bridge URL, and shows a set one without its secrets", async () => {
		const noBridge = await readiness({ [AGENT_PATH]: selfHosted() });
		const withBridge = await readiness({
			[AGENT_PATH]: selfHosted({
				bridgeUrl:
					"https://user:bridge-password@bridge.acme.dev/api/novu?token=bridge-query-secret",
			}),
		});
		const local = await readiness({
			[AGENT_PATH]: selfHosted({
				bridgeUrl: "https://bridge.acme.dev/api/novu",
				devBridgeActive: true,
				devBridgeUrl: "https://tunnel-1.novu.dev/api/novu?key=dev-query-secret",
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

	// `RuntimeResolver` sends every agent to the bridge but a Human relay or a managed one with its runtime.
	it("treats an agent saved before runtime existed, or managed without its runtime, as a bridge agent", async () => {
		const legacy = await readiness({ [AGENT_PATH]: selfHosted({ runtime: undefined }) });
		const managedWithoutRuntime = await readiness({
			[AGENT_PATH]: rawAgent({ managedRuntime: undefined }),
		});

		expect(legacy.value?.bridge).toEqual({ status: "no bridge URL" });
		expect(legacy.value?.channels?.[0]?.verdict).toBe("blocked");
		expect(managedWithoutRuntime.value?.bridge).toEqual({ status: "no bridge URL" });
	});

	it("blocks a bridge URL the bridge can't call", async () => {
		const noScheme = await readiness({
			[AGENT_PATH]: selfHosted({ bridgeUrl: "bridge.acme.dev/api/novu" }),
		});
		const badLocal = await readiness({
			[AGENT_PATH]: selfHosted({ devBridgeActive: true, devBridgeUrl: "http://exa mple" }),
		});

		expect(noScheme.value?.bridge).toEqual({
			status: "unusable bridge URL",
			url: "bridge.acme.dev/api/novu",
		});
		expect(noScheme.value?.blockedBy).toEqual([
			"the bridge URL has no http:// or https:// scheme, so the agent can't be reached",
		]);
		expect(badLocal.value?.bridge).toEqual({
			status: "unusable bridge URL",
			url: "[invalid URL]",
		});
	});

	it("gives a Human relay no bridge and no plan limits, as the inbound path skips them", async () => {
		const { value } = await readiness({
			[AGENT_PATH]: rawAgent({
				exceedsPlanLimit: true,
				managedRuntime: undefined,
				runtime: "human_relay",
			}),
			[LINKS_PATH]: respond(200, {
				data: [
					link("telegram", "telegram-1", {
						connectedAt: CONNECTED,
						exceedsPlanLimit: true,
					}),
				],
			}),
		});

		expect(value?.bridge).toBeUndefined();
		expect(value?.blockedBy).toBeUndefined();
		expect(value?.channels?.[0]?.verdict).toBe("ready");
	});

	it("blocks a channel past the plan's channel limit and a turned-off email inbox, not other inactive integrations", async () => {
		const { value } = await readiness({
			[LINKS_PATH]: respond(200, {
				data: [
					link("telegram", "telegram-1", {
						connectedAt: CONNECTED,
						exceedsPlanLimit: true,
					}),
					link("novu-email-agent", "email-1", {
						connectedAt: CONNECTED,
						integration: { active: false },
					}),
					link("slack", "slack-1", {
						connectedAt: CONNECTED,
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

	it("says when only some senders get a reply", async () => {
		const restricted = await readiness({
			[AGENT_PATH]: rawAgent({ behavior: { subscriberAccess: "restricted" } }),
		});
		const rule = await readiness({
			[AGENT_PATH]: rawAgent({ behavior: { subscriberAccess: "rule" } }),
		});

		expect(restricted.value?.restrictedAccess).toBe(true);
		expect(rule.value?.restrictedAccess).toBe(true);
	});

	it("reports channels it couldn't read instead of an empty answer", async () => {
		const forbidden = await readiness({ [LINKS_PATH]: respond(403, { message: "Forbidden" }) });
		const oddShape = await readiness({ [LINKS_PATH]: respond(200, { items: [] }) });

		expect(forbidden.value?.channels).toBeUndefined();
		expect(forbidden.value?.channelsError).toBe("couldn't check channels: status 403");
		expect(oddShape.value?.channelsError).toBe("couldn't check channels: unexpected response");
	});

	it("reports a network failure on the channels read", async () => {
		const fetchMock = stubApi(routes());
		const answer = fetchMock.getMockImplementation();
		fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
			if (url.includes("/integrations")) throw new TypeError("fetch failed");

			return (answer as NonNullable<typeof answer>)(url, init);
		});

		const { value } = await callReadiness();

		expect(value?.channelsError).toBe("couldn't check channels: network error");
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
