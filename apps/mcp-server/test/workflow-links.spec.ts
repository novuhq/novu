import { afterEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "./fake-api";
import { workflowResponseFixture } from "./fixtures/workflow-response";
import { callTool, connectAllTools, textOf, tokenAccessors } from "./support";

/** The JSON after a tool's "Successfully …:" line. */
function jsonOf(text: string) {
	return JSON.parse(text.slice(text.indexOf("\n\n") + 2));
}

describe("workflow dashboard links", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	async function client() {
		return connectAllTools(tokenAccessors("api-key"));
	}

	it("get_workflows links the list and each workflow to the dashboard", async () => {
		const workflow = workflowResponseFixture();
		stubApi({ "/v2/workflows": { totalCount: 1, workflows: [workflow] } });

		const text = textOf(await callTool(await client(), "get_workflows", {}));

		expect(text).toContain("Successfully fetched workflows:");
		const { data } = jsonOf(text);
		expect(data.dashboardPath).toBe("/workflows");
		expect(data.totalCount).toBe(1);
		expect(data.workflows[0]).toMatchObject({
			dashboardPath: "/workflows/welcome_wf_6650f0c2a1b2c3d4e5f60718",
			workflowId: "welcome",
		});
	});

	it("get_workflow links the workflow to its editor", async () => {
		stubApi({ "/v2/workflows/welcome": workflowResponseFixture() });

		const text = textOf(
			await callTool(await client(), "get_workflow", { workflowId: "welcome" }),
		);

		expect(jsonOf(text).data.dashboardPath).toBe(
			"/workflows/welcome_wf_6650f0c2a1b2c3d4e5f60718",
		);
	});

	it("gives a v1 workflow no link, since it opens in the legacy dashboard", async () => {
		stubApi({
			"/v2/workflows": {
				totalCount: 1,
				workflows: [{ ...workflowResponseFixture(), origin: "novu-cloud-v1" }],
			},
		});

		const text = textOf(await callTool(await client(), "get_workflows", {}));

		expect(jsonOf(text).data.workflows[0]).not.toHaveProperty("dashboardPath");
	});
});
