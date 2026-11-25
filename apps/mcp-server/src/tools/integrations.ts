import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiResponse } from "../types";
import type { ToolAccessors } from "../utils/tool-accessors";
import { type ApiCallResult, ToolFactory } from "../utils/tool-factory";
import { INTEGRATION_TOOL_NAMES } from "./tool-names";

export const DEFAULT_DASHBOARD_URL = "https://dashboard.novu.co";

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const PROVIDER_ID = /^[a-z0-9][a-z0-9_-]*$/i;

// The providers Novu records delivery events for: the email and push providers whose dashboard settings show activity
// tracking. The inbound webhook accepts only email and push, so Photon's toggle records nothing yet, and AppIO delivers
// into the IO app, which can't report events.
const EMAIL_PROVIDERS_WITH_TRACKING = new Set(["anypost", "mailgun", "resend", "sendgrid", "ses"]);
const PUSH_PROVIDERS_WITHOUT_TRACKING = new Set(["appio"]);
const PUSH_TRACKING_GUIDE_URL =
	"https://docs.novu.co/platform/integrations/push/push-activity-tracking";

type Integration = Record<string, unknown> & {
	_id?: string;
	_environmentId?: string;
	channel?: string;
	configurations?: Record<string, unknown>;
	name?: string;
	providerId?: string;
};

/** An integration as these tools return it: without its credentials or the inbound webhook signing key. */
export function redactIntegration(integration: Integration): Integration {
	const { credentials: _credentials, ...rest } = integration;
	if (!rest.configurations || typeof rest.configurations !== "object") {
		return rest;
	}

	const { inboundWebhookSigningKey: _signingKey, ...configurations } = rest.configurations;

	return { ...rest, configurations };
}

function unwrapData(json: unknown): unknown {
	return json && typeof json === "object" && "data" in json
		? (json as { data: unknown }).data
		: json;
}

function asIntegrations(data: unknown): Integration[] {
	const list = unwrapData(data);

	return Array.isArray(list) ? (list as Integration[]) : [];
}

function textResult(text: string): ApiResponse {
	return { content: [{ text, type: "text" as const }] };
}

function apiErrorResult(
	action: string,
	result: Extract<ApiCallResult, { ok: false }>,
): ApiResponse {
	return ToolFactory.errorResult({
		message: `Error: Failed to ${action}. Status: ${result.status}, Message: ${result.errorText}`,
		retryAfter: result.retryAfter,
		status: result.status,
	});
}

function describeIntegration(integration: Integration): string {
	return `"${integration.name ?? integration._id}" (${integration.providerId})`;
}

function supportsActivityTracking({ channel, providerId = "" }: Integration): boolean {
	if (channel === "email") return EMAIL_PROVIDERS_WITH_TRACKING.has(providerId);
	if (channel === "push") return !PUSH_PROVIDERS_WITHOUT_TRACKING.has(providerId);

	return false;
}

function dashboardUrl(accessors: ToolAccessors): string {
	return (accessors.getDashboardUrl?.() || DEFAULT_DASHBOARD_URL).replace(/\/$/, "");
}

/** The dashboard page with an existing integration's settings, credentials included. */
function integrationSettingsUrl(accessors: ToolAccessors, integrationId: string): string {
	return `${dashboardUrl(accessors)}/integrations/${encodeURIComponent(integrationId)}/update`;
}

/** Push events come from the customer's app, so Novu records none until their app and backend forward them. */
function pushTrackingSteps(accessors: ToolAccessors, integration: Integration): string {
	return ` Novu records push events only once the app sends them to the customer's backend and the backend forwards them to Novu with environment ID ${integration._environmentId} and integration ID ${integration._id}. The guide: ${PUSH_TRACKING_GUIDE_URL}. The integration's settings: ${integrationSettingsUrl(accessors, integration._id ?? "")}`;
}

export function registerIntegrationTools(server: McpServer, accessors: ToolAccessors) {
	ToolFactory.createTool(server, accessors, {
		description:
			"List channel integrations with environmentName, active, primary and settings; never credentials or signing keys. Every environment for OAuth, the key's own for API keys.",
		handler: async (_input, context) => {
			const [integrations, environments] = await Promise.all([
				ToolFactory.callApi(context, { endpoint: "/v1/integrations", method: "GET" }),
				ToolFactory.callApi(context, { endpoint: "/v1/environments", method: "GET" }),
			]);
			if (!integrations.ok) {
				return apiErrorResult("fetch integrations", integrations);
			}

			const environmentNames = new Map<string, string>();
			const environmentList = environments.ok ? unwrapData(environments.data) : [];
			for (const environment of Array.isArray(environmentList) ? environmentList : []) {
				if (typeof environment?._id === "string" && typeof environment?.name === "string") {
					environmentNames.set(environment._id, environment.name);
				}
			}

			const list = asIntegrations(integrations.data).map((integration) => {
				const environmentName = environmentNames.get(integration._environmentId ?? "");

				return {
					...redactIntegration(integration),
					...(environmentName && { environmentName }),
				};
			});

			return textResult(`Successfully fetched integrations:\n\n${JSON.stringify(list)}`);
		},
		name: INTEGRATION_TOOL_NAMES.GET_INTEGRATIONS,
		schema: z.object({}),
	});

	ToolFactory.createQueryGetTool(
		server,
		accessors,
		INTEGRATION_TOOL_NAMES.GET_ACTIVE_INTEGRATIONS,
		"List only the active integrations in your Novu organization",
		"fetched active integrations",
		z.object({}),
		{
			buildEndpoint: () => "/v1/integrations/active",
			formatSuccess: (data) =>
				`Successfully fetched active integrations:\n\n${JSON.stringify(asIntegrations(data).map(redactIntegration))}`,
		},
	);

	ToolFactory.createDeleteTool(
		server,
		accessors,
		INTEGRATION_TOOL_NAMES.DELETE_INTEGRATION,
		"Delete an integration by its integrationId. This action is irreversible.",
		"/v1/integrations/{id}",
		"deleted integration",
		"integrationId",
		"The ID of the integration to delete",
		// The API answers with the environment's remaining integrations; the model needs only the confirmation.
		(_data, integrationId) => `Successfully deleted integration ${integrationId}`,
	);

	ToolFactory.createTool(server, accessors, {
		description:
			"Mark an integration as the primary integration for its channel. The primary integration is used as the default for sending notifications on that channel.",
		handler: async (input, context) => {
			return ToolFactory.makeApiRequest(
				context,
				{
					endpoint: `/v1/integrations/${input.integrationId}/set-primary`,
					formatSuccess: (data) =>
						`Successfully set integration as primary ${input.integrationId}:\n\n${JSON.stringify(redactIntegration(unwrapData(data) as Integration))}`,
					identifier: input.integrationId,
					method: "POST",
					successMessage: "set integration as primary",
				},
				context.idempotencyKey,
			);
		},
		name: INTEGRATION_TOOL_NAMES.SET_PRIMARY_INTEGRATION,
		schema: z.object({
			integrationId: z.string().describe("The ID of the integration to set as primary"),
		}),
	});

	ToolFactory.createTool(server, accessors, {
		description:
			"Rename an integration, change its identifier, or turn it on or off. For credentials, use get_integration_setup_link.",
		handler: async ({ integrationId, ...changes }, context) => {
			const body = Object.fromEntries(
				Object.entries(changes).filter(([, value]) => value !== undefined),
			);
			if (Object.keys(body).length === 0) {
				return ToolFactory.errorResult({
					message: "Nothing to update: pass at least one of name, identifier or active.",
					status: 400,
				});
			}

			return ToolFactory.makeApiRequest(
				context,
				{
					body: { ...body, check: false },
					endpoint: `/v1/integrations/${encodeURIComponent(integrationId)}`,
					formatSuccess: (data) =>
						`Successfully updated integration ${integrationId}:\n\n${JSON.stringify(redactIntegration(unwrapData(data) as Integration))}`,
					identifier: integrationId,
					method: "PUT",
					successMessage: "update integration",
				},
				context.idempotencyKey,
			);
		},
		name: INTEGRATION_TOOL_NAMES.UPDATE_INTEGRATION,
		schema: z.object({
			active: z.boolean().optional().describe("On (true) or off (false)"),
			identifier: z.string().min(1).optional().describe("New identifier"),
			integrationId: z.string().describe("_id from get_integrations"),
			name: z.string().min(1).optional().describe("New name"),
		}),
	});

	ToolFactory.createTool(server, accessors, {
		description:
			"Turn activity tracking (provider delivery events in Activity) on or off for an email or push integration. Turning it on sets up the provider's webhook when it can, or returns the URL to add.",
		handler: async ({ enabled, integrationId }, context) => {
			const listed = await ToolFactory.callApi(context, {
				endpoint: "/v1/integrations",
				method: "GET",
			});
			if (!listed.ok) {
				return apiErrorResult("fetch integrations", listed);
			}

			const integration = asIntegrations(listed.data).find(
				(candidate) => candidate._id === integrationId,
			);
			if (!integration) {
				return ToolFactory.errorResult({
					message: `Integration ${integrationId} not found. Call get_integrations for the ids.`,
					status: 404,
				});
			}
			if (integration.channel === "in_app") {
				return ToolFactory.errorResult({
					message:
						"In-app integrations have no activity tracking: Novu records in-app events itself.",
					status: 400,
				});
			}
			// Turning it off stays allowed, so a flag set some other way can still be cleared.
			if (enabled && !supportsActivityTracking(integration)) {
				return ToolFactory.errorResult({
					message: `${describeIntegration(integration)} has no activity tracking. Novu records delivery events only for ${[...EMAIL_PROVIDERS_WITH_TRACKING].join(", ")} email integrations and for push integrations other than AppIO.`,
					status: 400,
				});
			}

			const label = describeIntegration(integration);
			const configurations = redactIntegration(integration).configurations ?? {};
			if (Boolean(configurations.inboundWebhookEnabled) === enabled) {
				// Set-up isn't rerun: SendGrid adds another event webhook on every auto-configure call.
				const setUpHint = !enabled
					? ""
					: integration.channel === "push"
						? pushTrackingSteps(accessors, integration)
						: ` If its delivery events don't reach Novu, the integration's settings have the webhook URL and the manual set-up guide: ${integrationSettingsUrl(accessors, integrationId)}. Turning it off and on again reruns the automatic set-up.`;

				return textResult(
					`Activity tracking is already ${enabled ? "on" : "off"} for ${label}.${setUpHint}`,
				);
			}

			// The signing key stays out of the body; the API keeps the stored one when it's left out.
			const saved = await ToolFactory.callApi(
				context,
				{
					body: {
						check: false,
						configurations: { ...configurations, inboundWebhookEnabled: enabled },
					},
					endpoint: `/v1/integrations/${encodeURIComponent(integrationId)}`,
					method: "PUT",
				},
				context.idempotencyKey,
			);
			if (!saved.ok) {
				return apiErrorResult(
					`turn ${enabled ? "on" : "off"} activity tracking for ${integrationId}`,
					saved,
				);
			}
			if (!enabled) {
				return textResult(
					`Activity tracking is off for ${label}. Novu no longer records its delivery events.`,
				);
			}
			// The dashboard doesn't set up a webhook for push providers either.
			if (integration.channel === "push") {
				return textResult(
					`Activity tracking is on for ${label}.${pushTrackingSteps(accessors, integration)}`,
				);
			}

			const configured = await ToolFactory.callApi(context, {
				endpoint: `/v1/integrations/${encodeURIComponent(integrationId)}/auto-configure`,
				method: "POST",
			});
			const outcome = (configured.ok ? configured.data : undefined) as
				| { success?: boolean; message?: string; webhookUrl?: string }
				| undefined;
			if (outcome?.success) {
				// A set-up can succeed and still leave a manual step, like Mailgun's signing key when it can't be read.
				const providerNote = outcome.message
					? ` The provider says: "${outcome.message}". The integration's settings: ${integrationSettingsUrl(accessors, integrationId)}`
					: "";

				return textResult(
					`Activity tracking is on for ${label}, and the provider now sends delivery events to Novu${outcome.webhookUrl ? ` at ${outcome.webhookUrl}` : ""}.${providerNote}`,
				);
			}

			const reason =
				outcome?.message ?? (configured.ok ? "no reason given" : configured.errorText);
			const manualStep = outcome?.webhookUrl
				? `Add this webhook URL for delivery events in the provider: ${outcome.webhookUrl}. The integration's settings have the manual set-up guide: ${integrationSettingsUrl(accessors, integrationId)}`
				: `The integration's settings have the webhook URL and the manual set-up guide: ${integrationSettingsUrl(accessors, integrationId)}`;

			return textResult(
				`Activity tracking is on for ${label}, but Novu couldn't set up the provider's webhook (${reason}). ${manualStep}`,
			);
		},
		name: INTEGRATION_TOOL_NAMES.SET_ACTIVITY_TRACKING,
		schema: z.object({
			enabled: z.boolean().describe("On (true) or off (false)"),
			integrationId: z.string().describe("_id from get_integrations"),
		}),
	});

	server.registerTool(
		INTEGRATION_TOOL_NAMES.GET_INTEGRATION_SETUP_LINK,
		{
			annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: true },
			description:
				"Dashboard link where the user enters credentials: the connect form for providerId, or an integration's settings for integrationId. Give it instead of asking for credentials. Calls no API.",
			inputSchema: {
				integrationId: z.string().optional().describe("_id from get_integrations"),
				providerId: z.string().optional().describe('Provider id, e.g. "sendgrid"'),
				// Not `environmentId`: that's every tool's environment to act in, which the Copilot sets itself and hides.
				targetEnvironmentId: z
					.string()
					.optional()
					.describe("With providerId: environment _id to connect in"),
			},
			title: "Get integration setup link",
		},
		async ({ integrationId, providerId, targetEnvironmentId }) => {
			if (!integrationId === !providerId) {
				return ToolFactory.errorResult({
					message:
						"Pass either integrationId (an existing integration) or providerId (a new one), not both.",
					status: 400,
				});
			}
			if (integrationId) {
				if (!OBJECT_ID.test(integrationId)) {
					return ToolFactory.errorResult({
						message: "integrationId must be an integration _id from get_integrations.",
						status: 400,
					});
				}

				return textResult(
					`Settings of integration ${integrationId}, where the user can change its credentials: ${integrationSettingsUrl(accessors, integrationId)}`,
				);
			}
			if (!PROVIDER_ID.test(providerId ?? "")) {
				return ToolFactory.errorResult({
					message: 'providerId must be a provider id such as "sendgrid".',
					status: 400,
				});
			}
			if (targetEnvironmentId !== undefined && !OBJECT_ID.test(targetEnvironmentId)) {
				return ToolFactory.errorResult({
					message:
						"targetEnvironmentId must be an environment _id, such as an integration's _environmentId from get_integrations.",
					status: 400,
				});
			}

			const query = targetEnvironmentId
				? `?environmentId=${encodeURIComponent(targetEnvironmentId)}`
				: "";

			return textResult(
				`Form to connect ${providerId}, where the user enters its credentials: ${dashboardUrl(accessors)}/integrations/connect/${encodeURIComponent(providerId ?? "")}${query}`,
			);
		},
	);
}
