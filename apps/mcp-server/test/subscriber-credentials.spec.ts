import { afterEach, describe, expect, it, vi } from "vitest";
import { maskCredentialValue } from "../src/utils/subscriber-credentials";
import { respond, stubApi } from "./fake-api";
import { rawSubscriber } from "./fixtures/subscriber";
import { callTool, connectAllTools, textOf, tokenAccessors } from "./support";

describe("maskCredentialValue", () => {
	it("keeps a four-character prefix", () => {
		expect(maskCredentialValue("abcdefgh")).toBe("abcd••••");
		expect(maskCredentialValue("abc")).toBe("•••");
		expect(maskCredentialValue("")).toBe("");
	});
});

describe("subscriber tools", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("masks push tokens and webhook URLs in get_subscriber", async () => {
		stubApi({ "/v2/subscribers/sub_8f21": rawSubscriber() });
		const client = await connectAllTools(tokenAccessors("api-key"));

		const text = textOf(await callTool(client, "get_subscriber", { subscriberId: "sub_8f21" }));

		expect(text).toContain("Successfully fetched subscriber sub_8f21:");
		expect(text).not.toContain("fcm-token-secret-1");
		expect(text).not.toContain("hooks.slack.com");
		expect(text).toContain("fcm-••••••••••••••");
		expect(text).toContain("jane@acme.com");
	});

	it("masks only channel credentials, so custom data can be sent back unchanged", async () => {
		const customData = {
			devices: { deviceTokens: ["custom-token"] },
			plan: "enterprise-secret-data",
			webhookUrl: "https://hooks.example.com/custom",
		};
		stubApi({
			"/v2/subscribers": respond(200, {
				data: [rawSubscriber({ data: customData })],
				next: null,
			}),
			"/v2/subscribers/sub_8f21": rawSubscriber({ data: customData }),
		});
		const client = await connectAllTools(tokenAccessors("api-key"));

		for (const [tool, args] of [
			["get_subscriber", { subscriberId: "sub_8f21" }],
			["find_subscribers", { email: "jane@acme.com" }],
		] as const) {
			const text = textOf(await callTool(client, tool, args));
			const body = JSON.parse(text.slice(text.indexOf("{")));
			const [found] = Array.isArray(body.data) ? body.data : [body.data];

			expect(found.data, tool).toEqual(customData);
			expect(text, tool).not.toContain("fcm-token-secret-1");
			expect(text, tool).not.toContain("hooks.slack.com");
		}
	});
});
