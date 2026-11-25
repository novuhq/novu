import { afterEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "./fake-api";
import { callTool, connectAllTools, textOf, tokenAccessors } from "./support";

describe("update_subscriber_preferences", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("updates only the preference channels it is given", async () => {
		const fetchMock = stubApi({ "/v2/subscribers/sub_8f21/preferences": { global: {} } });
		const client = await connectAllTools(tokenAccessors("api-key"));

		await callTool(client, "update_subscriber_preferences", {
			channels: { sms: false },
			subscriberId: "sub_8f21",
		});

		const [, init] = fetchMock.mock.calls[0];
		expect(init?.method).toBe("PATCH");
		expect(JSON.parse(String(init?.body))).toEqual({ channels: { sms: false } });
	});

	it("logs the subscriberId once when preferences are updated", async () => {
		stubApi({ "/v2/subscribers/sub_8f21/preferences": { global: {} } });
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		const client = await connectAllTools(tokenAccessors("api-key"));

		await callTool(client, "update_subscriber_preferences", {
			channels: { sms: false },
			subscriberId: "sub_8f21",
		});

		expect(log).toHaveBeenCalledWith(
			"Successfully updated subscriber preferences for sub_8f21",
		);
		log.mockRestore();
	});

	it("still accepts all five channels and refuses none", async () => {
		const fetchMock = stubApi({ "/v2/subscribers/sub_8f21/preferences": { global: {} } });
		const client = await connectAllTools(tokenAccessors("api-key"));

		const allFive = await callTool(client, "update_subscriber_preferences", {
			channels: { chat: true, email: true, in_app: true, push: true, sms: false },
			subscriberId: "sub_8f21",
		});
		expect(allFive.isError).toBeFalsy();

		const none = await callTool(client, "update_subscriber_preferences", {
			channels: {},
			subscriberId: "sub_8f21",
		});
		expect(none.isError).toBe(true);
		expect(textOf(none)).toContain('e.g. { "sms": false }');
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
