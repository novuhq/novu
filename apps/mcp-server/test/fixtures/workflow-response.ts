/**
 * A `WorkflowResponseDto` as `GET /v2/workflows/:id` returns it (inside the
 * `data` envelope), modelled on `libs/application-generic/src/dtos/workflow`
 * and the workflows-v2 e2e responses. Block-editor email bodies are stored
 * as stringified Maily JSON.
 */
const mailyBody = JSON.stringify({
	content: [{ content: [{ text: "Hi {{payload.name}}", type: "text" }], type: "paragraph" }],
	type: "doc",
});

export function workflowResponseFixture() {
	return {
		_id: "6650f0c2a1b2c3d4e5f60718",
		active: true,
		agent: null,
		createdAt: "2026-10-01T10:00:00.000Z",
		description: "Sent after sign-up",
		issues: {},
		isTranslationEnabled: false,
		lastPublishedAt: null,
		lastPublishedBy: null,
		lastTriggeredAt: "2026-10-20T08:00:00.000Z",
		name: "Welcome",
		origin: "novu-cloud",
		payloadExample: { name: "name" },
		payloadSchema: {
			additionalProperties: false,
			properties: { name: { type: "string" } },
			required: ["name"],
			type: "object",
		},
		preferences: {
			default: {
				all: { enabled: true, readOnly: false },
				channels: { email: { enabled: true }, in_app: { enabled: false } },
			},
			user: {
				all: { enabled: true, readOnly: true },
				channels: { email: { enabled: true } },
			},
		},
		severity: "high",
		slug: "welcome_wf_6650f0c2a1b2c3d4e5f60718",
		status: "ACTIVE",
		steps: [
			{
				_id: "6650f0c2a1b2c3d4e5f60801",
				controls: {
					dataSchema: { type: "object" },
					uiSchema: { group: "IN_APP", properties: {} },
					values: { body: "Welcome {{payload.name}}", subject: "Hi" },
				},
				controlValues: { body: "Welcome {{payload.name}}", subject: "Hi" },
				issues: {},
				name: "In-App Step",
				origin: "novu-cloud",
				slug: "in-app-step_st_6650f0c2a1b2c3d4e5f60801",
				stepId: "in-app-step",
				type: "in_app",
				variables: { properties: {}, type: "object" },
				workflowDatabaseId: "6650f0c2a1b2c3d4e5f60718",
				workflowId: "welcome",
			},
			{
				_id: "6650f0c2a1b2c3d4e5f60802",
				controls: { dataSchema: {}, uiSchema: {}, values: {} },
				controlValues: {
					body: mailyBody,
					editorType: "block",
					layoutId: null,
					subject: "Welcome {{payload.name}}",
				},
				issues: {},
				name: "Email Step",
				origin: "novu-cloud",
				slug: "email-step_st_6650f0c2a1b2c3d4e5f60802",
				stepId: "email-step",
				type: "email",
				variables: { properties: {}, type: "object" },
				workflowDatabaseId: "6650f0c2a1b2c3d4e5f60718",
				workflowId: "welcome",
			},
			{
				_id: "6650f0c2a1b2c3d4e5f60803",
				controls: { dataSchema: {}, uiSchema: {}, values: {} },
				controlValues: { body: "New sign-up: {{payload.name}}" },
				integrationOverrides: { "slack-prod": { channel: "#signups" } },
				issues: {},
				name: "Chat Step",
				origin: "novu-cloud",
				providerOverrides: { slack: { blocks: [{ type: "divider" }] } },
				slug: "chat-step_st_6650f0c2a1b2c3d4e5f60803",
				stepId: "chat-step",
				type: "chat",
				variables: { properties: {}, type: "object" },
				workflowDatabaseId: "6650f0c2a1b2c3d4e5f60718",
				workflowId: "welcome",
			},
		],
		tags: ["onboarding"],
		updatedAt: "2026-10-20T09:00:00.000Z",
		updatedBy: { _id: "u1", firstName: "Ada", lastName: "L" },
		validatePayload: true,
		workflowId: "welcome",
	};
}

export const MAILY_BODY = mailyBody;
