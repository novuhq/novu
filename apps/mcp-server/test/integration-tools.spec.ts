import { afterEach, describe, expect, it, vi } from "vitest";
import { API_URL, callTool, connectAllTools, textOf, tokenAccessors } from "./support";

const SENDGRID_ID = "6650f0c2a1b2c3d4e5f60001";
const FCM_ID = "6650f0c2a1b2c3d4e5f60002";
const NOVU_INBOX_ID = "6650f0c2a1b2c3d4e5f60003";
const DEVELOPMENT_ID = "6650f0c2a1b2c3d4e5f6000a";
const PRODUCTION_ID = "6650f0c2a1b2c3d4e5f6000b";
const SIGNING_KEY = "whsec_planted_secret";

type Json = Record<string, any>;

function integrationsFixture(): Json[] {
	return [
		{
			_environmentId: PRODUCTION_ID,
			_id: SENDGRID_ID,
			active: true,
			channel: "email",
			configurations: {
				inboundWebhookEnabled: false,
				inboundWebhookSigningKey: SIGNING_KEY,
				inboxCount: "1",
			},
			credentials: { apiKey: "SG.planted" },
			name: "SendGrid",
			primary: true,
			providerId: "sendgrid",
		},
		{
			_environmentId: DEVELOPMENT_ID,
			_id: FCM_ID,
			active: true,
			channel: "push",
			configurations: {},
			credentials: {},
			name: "FCM",
			providerId: "fcm",
		},
		{
			_environmentId: DEVELOPMENT_ID,
			_id: NOVU_INBOX_ID,
			active: true,
			channel: "in_app",
			credentials: {},
			name: "Novu Inbox",
			providerId: "novu",
		},
	];
}

/** A fake integrations API: the list, the environments, updates, deletes and auto-configure. */
function fakeIntegrationsApi(
	autoConfigure: Json = { success: true, webhookUrl: "https://api.novu.co/v2/hook" },
	integrations: Json[] = integrationsFixture(),
) {
	const requests: Array<{ method: string; path: string; body?: Json }> = [];
	const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
		const { pathname } = new URL(url);
		const method = init?.method ?? "GET";
		const body = init?.body ? JSON.parse(String(init.body)) : undefined;
		requests.push({ body, method, path: pathname });

		if (method === "GET" && pathname === "/v1/integrations")
			return json({ data: integrations });
		if (method === "GET" && pathname === "/v1/integrations/active")
			return json({ data: integrations.filter((integration) => integration.active) });
		if (method === "GET" && pathname === "/v1/environments") {
			return json({
				data: [
					{ _id: DEVELOPMENT_ID, name: "Development" },
					{ _id: PRODUCTION_ID, name: "Production" },
				],
			});
		}
		if (method === "PUT") {
			const integration = integrations.find((candidate) => pathname.endsWith(candidate._id));

			return json({ data: { ...integration, ...body } });
		}
		// Like the API, a delete answers with the environment's remaining integrations.
		if (method === "DELETE")
			return json({
				data: integrations.filter((integration) => !pathname.endsWith(integration._id)),
			});
		if (method === "POST" && pathname.endsWith("/auto-configure"))
			return json({ data: autoConfigure });
		if (method === "POST" && pathname.endsWith("/set-primary"))
			return json({ data: integrations[0] });

		return json({ message: "unexpected" }, 500);
	});
	vi.stubGlobal("fetch", fetchMock);

	return { fetchMock, requests };
}

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		headers: { "Content-Type": "application/json" },
		status,
	});
}

describe("integration tools", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("get_integrations", () => {
		it("never returns credentials or the signing key, and names each environment", async () => {
			fakeIntegrationsApi();
			const client = await connectAllTools(tokenAccessors("api-key"));

			const text = textOf(await callTool(client, "get_integrations"));

			expect(text).not.toContain(SIGNING_KEY);
			expect(text).not.toContain("SG.planted");
			expect(text).not.toContain("credentials");
			const list = JSON.parse(text.slice(text.indexOf("[")));
			expect(list.map((integration: Json) => integration.environmentName)).toEqual([
				"Production",
				"Development",
				"Development",
			]);
			expect(list[0].configurations).toEqual({
				inboundWebhookEnabled: false,
				inboxCount: "1",
			});
		});

		it("returns the API error with its status", async () => {
			vi.stubGlobal(
				"fetch",
				vi.fn(async () => json({ message: "Forbidden" }, 403)),
			);
			const client = await connectAllTools(tokenAccessors("api-key"));

			const result = await callTool(client, "get_integrations");

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({ error: { status: 403 } });
		});
	});

	it("get_active_integrations never returns credentials or the signing key", async () => {
		fakeIntegrationsApi();
		const client = await connectAllTools(tokenAccessors("api-key"));

		const text = textOf(await callTool(client, "get_active_integrations"));

		expect(text).toContain("Successfully fetched active integrations");
		expect(text).toContain(SENDGRID_ID);
		expect(text).not.toContain(SIGNING_KEY);
		expect(text).not.toContain("SG.planted");
	});

	it("set_primary_integration never returns credentials or the signing key", async () => {
		fakeIntegrationsApi();
		const client = await connectAllTools(tokenAccessors("api-key"));

		const text = textOf(
			await callTool(client, "set_primary_integration", { integrationId: SENDGRID_ID }),
		);

		expect(text).toContain("Successfully set integration as primary");
		expect(text).not.toContain(SIGNING_KEY);
		expect(text).not.toContain("SG.planted");
	});

	it("delete_integration confirms without echoing the remaining integrations", async () => {
		const { requests } = fakeIntegrationsApi();
		const client = await connectAllTools(tokenAccessors("api-key"));

		const text = textOf(
			await callTool(client, "delete_integration", { integrationId: FCM_ID }),
		);

		expect(requests).toEqual([{ method: "DELETE", path: `/v1/integrations/${FCM_ID}` }]);
		expect(text).toBe(`Successfully deleted integration ${FCM_ID}`);
	});

	describe("update_integration", () => {
		it("sends only the fields to change", async () => {
			const { requests } = fakeIntegrationsApi();
			const client = await connectAllTools(tokenAccessors("api-key"));

			const text = textOf(
				await callTool(client, "update_integration", {
					active: false,
					integrationId: SENDGRID_ID,
				}),
			);

			expect(requests).toEqual([
				{
					body: { active: false, check: false },
					method: "PUT",
					path: `/v1/integrations/${SENDGRID_ID}`,
				},
			]);
			expect(text).toContain("Successfully updated integration");
			expect(text).not.toContain(SIGNING_KEY);
			expect(text).not.toContain("SG.planted");
		});

		it("refuses a call that changes nothing", async () => {
			const { fetchMock } = fakeIntegrationsApi();
			const client = await connectAllTools(tokenAccessors("api-key"));

			const result = await callTool(client, "update_integration", {
				integrationId: SENDGRID_ID,
			});

			expect(result.isError).toBe(true);
			expect(textOf(result)).toContain("pass at least one of name, identifier or active");
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it("takes no credentials", async () => {
			fakeIntegrationsApi();
			const client = await connectAllTools(tokenAccessors("api-key"));

			const { tools } = await client.listTools();
			const properties = Object.keys(
				tools.find((tool) => tool.name === "update_integration")?.inputSchema.properties ??
					{},
			);

			expect(properties).not.toContain("credentials");
		});
	});

	describe("set_activity_tracking", () => {
		it("turns it on without sending the signing key, then sets up the provider's webhook", async () => {
			const { requests } = fakeIntegrationsApi();
			const client = await connectAllTools(tokenAccessors("api-key"));

			const text = textOf(
				await callTool(client, "set_activity_tracking", {
					enabled: true,
					integrationId: SENDGRID_ID,
				}),
			);

			const put = requests.find((request) => request.method === "PUT");
			expect(put?.body).toEqual({
				check: false,
				configurations: { inboundWebhookEnabled: true, inboxCount: "1" },
			});
			expect(requests[requests.length - 1]).toMatchObject({
				method: "POST",
				path: `/v1/integrations/${SENDGRID_ID}/auto-configure`,
			});
			expect(text).toContain("Activity tracking is on");
			expect(text).toContain("https://api.novu.co/v2/hook");
		});

		it("gives the webhook URL and the settings link when the provider can't be set up", async () => {
			fakeIntegrationsApi({
				message: "missing permission",
				success: false,
				webhookUrl: "https://eu.api.novu.co/v2/hook",
			});
			const client = await connectAllTools({
				...tokenAccessors("api-key"),
				getDashboardUrl: () => "https://eu.dashboard.novu.co/",
			});

			const text = textOf(
				await callTool(client, "set_activity_tracking", {
					enabled: true,
					integrationId: SENDGRID_ID,
				}),
			);

			expect(text).toContain("missing permission");
			expect(text).toContain("https://eu.api.novu.co/v2/hook");
			expect(text).toContain(
				`https://eu.dashboard.novu.co/integrations/${SENDGRID_ID}/update`,
			);
		});

		it("passes on a manual step the provider still asks for after setting up its webhook", async () => {
			fakeIntegrationsApi({
				message: "Please add your HTTP Webhook Signing Key from Mailgun Control Panel.",
				success: true,
				webhookUrl: "https://api.novu.co/v2/hook",
			});
			const client = await connectAllTools(tokenAccessors("api-key"));

			const text = textOf(
				await callTool(client, "set_activity_tracking", {
					enabled: true,
					integrationId: SENDGRID_ID,
				}),
			);

			expect(text).toContain("Activity tracking is on");
			expect(text).toContain("Please add your HTTP Webhook Signing Key");
			expect(text).toContain(`/integrations/${SENDGRID_ID}/update`);
		});

		it("gives the manual set-up steps when it's already on, without setting the webhook up again", async () => {
			const integrations = integrationsFixture();
			integrations[0].configurations.inboundWebhookEnabled = true;
			const { requests } = fakeIntegrationsApi(undefined, integrations);
			const client = await connectAllTools(tokenAccessors("api-key"));

			const text = textOf(
				await callTool(client, "set_activity_tracking", {
					enabled: true,
					integrationId: SENDGRID_ID,
				}),
			);

			expect(text).toContain("already on");
			expect(text).toContain(`/integrations/${SENDGRID_ID}/update`);
			expect(requests.map((request) => request.method)).toEqual(["GET"]);
		});

		it("changes nothing when it's already in that state", async () => {
			const { requests } = fakeIntegrationsApi();
			const client = await connectAllTools(tokenAccessors("api-key"));

			const text = textOf(
				await callTool(client, "set_activity_tracking", {
					enabled: false,
					integrationId: SENDGRID_ID,
				}),
			);

			expect(text).toContain("already off");
			expect(requests.map((request) => request.method)).toEqual(["GET"]);
		});

		it("sets no webhook up for a push provider, and gives the steps left for the customer's app", async () => {
			const { requests } = fakeIntegrationsApi();
			const client = await connectAllTools(tokenAccessors("api-key"));

			const text = textOf(
				await callTool(client, "set_activity_tracking", {
					enabled: true,
					integrationId: FCM_ID,
				}),
			);

			expect(requests.map((request) => request.method)).toEqual(["GET", "PUT"]);
			expect(text).toContain("Activity tracking is on");
			expect(text).toContain(`environment ID ${DEVELOPMENT_ID}`);
			expect(text).toContain(`integration ID ${FCM_ID}`);
			expect(text).toContain("/platform/integrations/push/push-activity-tracking");
			expect(text).toContain(`/integrations/${FCM_ID}/update`);
		});

		it("gives the push steps when it's already on", async () => {
			const integrations = integrationsFixture();
			integrations[1].configurations.inboundWebhookEnabled = true;
			fakeIntegrationsApi(undefined, integrations);
			const client = await connectAllTools(tokenAccessors("api-key"));

			const text = textOf(
				await callTool(client, "set_activity_tracking", {
					enabled: true,
					integrationId: FCM_ID,
				}),
			);

			expect(text).toContain("already on");
			expect(text).toContain("/platform/integrations/push/push-activity-tracking");
		});

		it.each([
			["push", "appio"],
			["sms", "twilio"],
			["email", "nodemailer"],
		])(
			"refuses to turn it on for a %s provider Novu tracks nothing for (%s)",
			async (channel, providerId) => {
				const integrations = integrationsFixture();
				Object.assign(integrations[1], { channel, providerId });
				const { requests } = fakeIntegrationsApi(undefined, integrations);
				const client = await connectAllTools(tokenAccessors("api-key"));

				const result = await callTool(client, "set_activity_tracking", {
					enabled: true,
					integrationId: FCM_ID,
				});

				expect(result.isError).toBe(true);
				expect(result.structuredContent).toMatchObject({ error: { status: 400 } });
				expect(textOf(result)).toContain("has no activity tracking");
				expect(requests.map((request) => request.method)).toEqual(["GET"]);
			},
		);

		it("refuses an in-app integration", async () => {
			fakeIntegrationsApi();
			const client = await connectAllTools(tokenAccessors("api-key"));

			const result = await callTool(client, "set_activity_tracking", {
				enabled: true,
				integrationId: NOVU_INBOX_ID,
			});

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({ error: { status: 400 } });
		});

		it("says when the integration doesn't exist", async () => {
			fakeIntegrationsApi();
			const client = await connectAllTools(tokenAccessors("api-key"));

			const result = await callTool(client, "set_activity_tracking", {
				enabled: true,
				integrationId: "6650f0c2a1b2c3d4e5f6ffff",
			});

			expect(result.structuredContent).toMatchObject({ error: { status: 404 } });
			expect(textOf(result)).toContain("get_integrations");
		});
	});

	describe("get_integration_setup_link", () => {
		it("links to the connect form in the US dashboard by default, calling no API", async () => {
			const { fetchMock } = fakeIntegrationsApi();
			const client = await connectAllTools(tokenAccessors("api-key"));

			const text = textOf(
				await callTool(client, "get_integration_setup_link", {
					providerId: "sendgrid",
					targetEnvironmentId: PRODUCTION_ID,
				}),
			);

			expect(text).toContain(
				`https://dashboard.novu.co/integrations/connect/sendgrid?environmentId=${PRODUCTION_ID}`,
			);
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it("links to an integration's settings in the region's dashboard", async () => {
			const client = await connectAllTools({
				...tokenAccessors("api-key"),
				getDashboardUrl: () => "https://eu.dashboard.novu.co",
			});

			const text = textOf(
				await callTool(client, "get_integration_setup_link", {
					integrationId: SENDGRID_ID,
				}),
			);

			expect(text).toContain(
				`https://eu.dashboard.novu.co/integrations/${SENDGRID_ID}/update`,
			);
		});

		it.each([
			[{}, "either integrationId"],
			[{ integrationId: SENDGRID_ID, providerId: "sendgrid" }, "either integrationId"],
			[{ providerId: "../billing" }, "provider id"],
			[{ integrationId: "not-an-id" }, "integration _id"],
			[{ providerId: "sendgrid", targetEnvironmentId: "prod" }, "environment _id"],
		])("refuses %j", async (args, message) => {
			const client = await connectAllTools(tokenAccessors("api-key"));

			const result = await callTool(client, "get_integration_setup_link", args);

			expect(result.isError).toBe(true);
			expect(textOf(result)).toContain(message);
		});

		it("is annotated as read-only", async () => {
			const client = await connectAllTools(tokenAccessors("api-key"));

			const { tools } = await client.listTools();

			expect(
				tools.find((tool) => tool.name === "get_integration_setup_link")?.annotations,
			).toEqual({
				destructiveHint: false,
				openWorldHint: false,
				readOnlyHint: true,
			});
		});
	});

	it("sends every request to the configured API", async () => {
		const { fetchMock } = fakeIntegrationsApi();
		const client = await connectAllTools(tokenAccessors("api-key"));

		await callTool(client, "get_integrations");

		expect(fetchMock.mock.calls.every(([url]) => String(url).startsWith(API_URL))).toBe(true);
	});
});
