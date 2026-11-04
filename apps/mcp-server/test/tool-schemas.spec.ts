import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stepTypeSchema, workflowStepSchema } from "../src/utils/workflow-schemas";
import { fakeWorkflowsApi } from "./fake-api";
import { dashboardEmailBodies } from "./fixtures/dashboard-email-bodies";
import { callTool, connectAllTools, textOf, tokenAccessors } from "./support";

/*
 * claude.ai drops a tool whose input schema is over 16 KB and ChatGPT one over
 * 5,000 tokens. Tool inputs advertise the input side of a `loose.pipe(strict)`
 * schema; if that ever flips back to the strict side, tools/list returns to
 * about 2.3 MB and these budgets fail first.
 */
const MAX_TOOLS_LIST_BYTES = 100_000;
const MAX_INPUT_SCHEMA_BYTES = 12_288;
const MAX_TOOL_BYTES = 16_000;
const MAX_SCHEMA_DEPTH = 16;
const MAX_STEP_SCHEMA_CHARS = 32_000;

const STEP_TOOLS = [
	"create_workflow",
	"update_workflow",
	"add_workflow_step",
	"insert_workflow_step",
	"update_workflow_step_content",
];

type Json = Record<string, any>;

const ajv = new AjvJsonSchemaValidator();

async function client(token: string | null = "api-key") {
	return connectAllTools(tokenAccessors(token));
}

function bytes(value: unknown): number {
	return Buffer.byteLength(JSON.stringify(value));
}

function keysAnywhere(value: unknown, found = new Set<string>()): Set<string> {
	if (Array.isArray(value)) {
		for (const item of value) keysAnywhere(item, found);
	} else if (value && typeof value === "object") {
		for (const [key, child] of Object.entries(value)) {
			found.add(key);
			keysAnywhere(child, found);
		}
	}

	return found;
}

function depth(value: unknown): number {
	if (!value || typeof value !== "object") return 0;

	return 1 + Math.max(0, ...Object.values(value).map(depth));
}

/** The top-level controlValues keys of a step type's JSON Schema, across its variants. */
function controlKeys(schema: Json): string[] {
	const variants: Json[] = schema.oneOf ?? schema.anyOf ?? [schema];

	return [...new Set(variants.flatMap((variant) => Object.keys(variant.properties ?? {})))];
}

async function stepSchema(stepType: string): Promise<Json> {
	const result = await callTool(await client(), "get_step_schema", { stepType });
	expect(result.isError).toBeFalsy();

	return JSON.parse(textOf(result));
}

describe("advertised tool schemas", () => {
	it("keep tools/list and every tool within the sizes MCP clients load", async () => {
		const { tools } = await (await client()).listTools();

		expect(bytes({ tools })).toBeLessThan(MAX_TOOLS_LIST_BYTES);
		for (const tool of tools) {
			expect(bytes(tool.inputSchema), tool.name).toBeLessThan(MAX_INPUT_SCHEMA_BYTES);
			expect(bytes(tool), tool.name).toBeLessThan(MAX_TOOL_BYTES);
			expect(depth(tool.inputSchema), tool.name).toBeLessThanOrEqual(MAX_SCHEMA_DEPTH);
		}
	});

	it("inline every schema, since several clients cannot resolve $ref", async () => {
		const { tools } = await (await client()).listTools();

		for (const tool of tools) {
			const keys = keysAnywhere(tool.inputSchema);
			for (const key of ["$ref", "$defs", "definitions"]) {
				expect(keys.has(key), `${tool.name} has ${key}`).toBe(false);
			}
		}
	});

	it("compile as JSON Schema", async () => {
		const { tools } = await (await client()).listTools();

		for (const tool of tools) {
			expect(() => ajv.getValidator(tool.inputSchema), tool.name).not.toThrow();
		}
	});

	it("advertise free-form controlValues for the step tools, with the get_step_schema hint", async () => {
		const { tools } = await (await client()).listTools();
		const byName = new Map(tools.map((tool) => [tool.name, tool]));
		const step = (byName.get("add_workflow_step")!.inputSchema as Json).properties.step;

		expect(step.properties.controlValues).not.toHaveProperty("oneOf");
		expect(step.properties.controlValues).not.toHaveProperty("anyOf");
		expect(step.properties.controlValues.additionalProperties).toEqual({});
		for (const name of STEP_TOOLS) {
			expect(byName.get(name)!.description, name).toContain("get_step_schema");
		}
	});

	it("still accept every input the strict schemas accept", async () => {
		const { tools } = await (await client()).listTools();
		const addStep = tools.find((tool) => tool.name === "add_workflow_step")!;
		const validate = ajv.getValidator(addStep.inputSchema);

		for (const body of Object.values(dashboardEmailBodies)) {
			const args = {
				step: {
					controlValues: { body, editorType: "block", subject: "Hi" },
					name: "Email",
					type: "email",
				},
				workflowId: "welcome",
			};
			expect(validate(args).valid).toBe(true);
		}
	});

	it("list every top-level controlValues key in the step field guide", async () => {
		const { tools } = await (await client()).listTools();
		const addStep = tools.find((tool) => tool.name === "add_workflow_step")!;
		const guide: string = (addStep.inputSchema as Json).properties.step.properties.controlValues
			.description;

		for (const stepType of stepTypeSchema.options) {
			const { schema } = await stepSchema(stepType);
			for (const key of controlKeys(schema)) {
				expect(guide, `${stepType}.${key}`).toContain(key);
			}
		}
	});
});

describe("get_step_schema", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it.each(stepTypeSchema.options)(
		"returns a compiling schema and a valid example for %s",
		async (stepType) => {
			const reference = await stepSchema(stepType);
			const validate = ajv.getValidator(reference.schema);

			expect(reference.stepType).toBe(stepType);
			expect(validate(reference.example)).toMatchObject({ valid: true });
			expect(
				workflowStepSchema.safeParse({
					controlValues: reference.example,
					name: "Step",
					type: stepType,
				}).success,
			).toBe(true);
			expect(JSON.stringify(reference).length).toBeLessThan(MAX_STEP_SCHEMA_CHARS);
		},
	);

	it("describes every Maily node of the email body once and how to build it", async () => {
		const reference = await stepSchema("email");
		const schemaText = JSON.stringify(reference.schema);

		expect(reference.notes).toContain('{ "type": "doc", "content": [blocks] }');
		for (const node of ["paragraph", "columns", "repeat", "inlineImage", "variable", "link"]) {
			expect(schemaText).toContain(`"${node}"`);
		}
		for (const body of Object.values(dashboardEmailBodies)) {
			const controlValues = { body, editorType: "block", subject: "Hi" };
			expect(ajv.getValidator(reference.schema)(controlValues)).toMatchObject({
				valid: true,
			});
		}
	});

	it("works without a credential and never calls the Novu API", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const result = await callTool(await client(null), "get_step_schema", { stepType: "sms" });

		expect(result.isError).toBeFalsy();
		expect(JSON.parse(textOf(result)).schema.properties).toHaveProperty("body");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("rejects an unknown step type", async () => {
		const result = await callTool(await client(), "get_step_schema", { stepType: "fax" });

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain("at stepType");
	});

	it("is advertised as read-only", async () => {
		const { tools } = await (await client()).listTools();
		const tool = tools.find((candidate) => candidate.name === "get_step_schema")!;

		expect(tool.annotations).toMatchObject({ openWorldHint: false, readOnlyHint: true });
	});
});

describe("strict validation behind the advertised schemas", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("rejects an invalid email body node at its path before any request", async () => {
		const api = fakeWorkflowsApi();

		const result = await callTool(await client(), "add_workflow_step", {
			step: {
				controlValues: {
					body: { content: [{ type: "notANode" }], type: "doc" },
					editorType: "block",
					subject: "Hi",
				},
				name: "Email",
				type: "email",
			},
			workflowId: "welcome",
		});

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain("at step.controlValues.body.content[0].type");
		expect(api.requests).toHaveLength(0);
	});

	it("rejects an unknown control value enum at its path before any request", async () => {
		const api = fakeWorkflowsApi();

		const result = await callTool(await client(), "add_workflow_step", {
			step: {
				controlValues: { amount: 5, type: "regular", unit: "fortnights" },
				name: "Wait",
				type: "delay",
			},
			workflowId: "welcome",
		});

		expect(textOf(result)).toContain("at step.controlValues.unit");
		expect(api.requests).toHaveLength(0);
	});

	it("saves the dashboard's email bodies through add_workflow_step", async () => {
		const api = fakeWorkflowsApi();

		const bodies = Object.entries(dashboardEmailBodies);
		for (const [label, body] of bodies) {
			const result = await callTool(await client(), "add_workflow_step", {
				step: {
					controlValues: { body, editorType: "block", subject: "Hi" },
					name: label,
					type: "email",
				},
				workflowId: "welcome",
			});

			expect(result.isError, label).toBeFalsy();
		}
		expect(api.puts).toHaveLength(bodies.length);
	});

	it("accepts the null fields strict-mode callers send for a payload property's other types", async () => {
		const api = fakeWorkflowsApi();

		const result = await callTool(await client(), "update_workflow_payload_schema", {
			addProperties: [
				{
					arrayItemProperties: null,
					arrayItemsType: null,
					enumValues: null,
					isRequired: true,
					name: "tier",
					type: "string",
				},
			],
			workflowId: "welcome",
		});

		expect(result.isError).toBeFalsy();
		expect(api.puts[0].body!.payloadSchema.properties.tier).toEqual({ type: "string" });
	});
});
