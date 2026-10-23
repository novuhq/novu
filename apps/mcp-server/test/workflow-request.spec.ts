import { describe, expect, it } from "vitest";
import { toUpdateWorkflowRequest } from "../src/utils/workflow-request";
import { MAILY_BODY, workflowResponseFixture } from "./fixtures/workflow-response";

describe("toUpdateWorkflowRequest", () => {
	it("turns a fetched workflow into a PUT body with only editable fields", () => {
		const request = toUpdateWorkflowRequest(workflowResponseFixture());

		expect(request).toEqual({
			active: true,
			agent: null,
			description: "Sent after sign-up",
			isTranslationEnabled: false,
			name: "Welcome",
			payloadSchema: workflowResponseFixture().payloadSchema,
			preferences: {
				user: {
					all: { enabled: true, readOnly: true },
					channels: { email: { enabled: true } },
				},
				workflow: {
					all: { enabled: true, readOnly: false },
					channels: { email: { enabled: true }, in_app: { enabled: false } },
				},
			},
			severity: "high",
			steps: [
				{
					_id: "6650f0c2a1b2c3d4e5f60801",
					controlValues: { body: "Welcome {{payload.name}}", subject: "Hi" },
					name: "In-App Step",
					stepId: "in-app-step",
					type: "in_app",
				},
				{
					_id: "6650f0c2a1b2c3d4e5f60802",
					controlValues: {
						body: MAILY_BODY,
						editorType: "block",
						layoutId: null,
						subject: "Welcome {{payload.name}}",
					},
					name: "Email Step",
					stepId: "email-step",
					type: "email",
				},
				{
					_id: "6650f0c2a1b2c3d4e5f60803",
					controlValues: { body: "New sign-up: {{payload.name}}" },
					integrationOverrides: { "slack-prod": { channel: "#signups" } },
					name: "Chat Step",
					providerOverrides: { slack: { blocks: [{ type: "divider" }] } },
					stepId: "chat-step",
					type: "chat",
				},
			],
			tags: ["onboarding"],
			validatePayload: true,
		});
	});

	it("keeps existing step ids untouched", () => {
		const workflow = workflowResponseFixture();
		workflow.steps[0].stepId = "Send In-App  Notice!";

		const request = toUpdateWorkflowRequest(workflow);

		expect(request.steps[0].stepId).toBe("Send In-App  Notice!");
		expect(request.steps[1].stepId).toBe("email-step");
	});

	it("keeps a block email body as a string", () => {
		const workflow = workflowResponseFixture();
		const doc = JSON.parse(MAILY_BODY);
		workflow.steps[1].controlValues.body = doc;

		const request = toUpdateWorkflowRequest(workflow);

		expect(request.steps[1].controlValues.body).toBe(MAILY_BODY);
	});
});
