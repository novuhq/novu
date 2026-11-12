import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
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

/** Keys a guide segment names outside any nested `{ ... }`, skipping quoted examples. */
function guideTopLevelKeys(segment: string): string[] {
	const keys: string[] = [];
	let depth = 0;
	for (const [token, key] of segment.matchAll(
		/"(?:[^"\\]|\\.)*"|[{}]|\b([a-zA-Z_]+)\??(?=\s*([:,}(]|$))/g,
	)) {
		if (token === "{") depth++;
		else if (token === "}") depth--;
		else if (key && depth <= 1) keys.push(key);
	}

	return keys;
}

/** Replaces every `$ref` with its definition, giving the schema back as Zod inlines it. */
function inlineDefinitions(schema: Json): Json {
	const { definitions = {}, ...root } = schema;
	const inline = (node: unknown): unknown => {
		if (Array.isArray(node)) return node.map(inline);
		if (!node || typeof node !== "object") return node;

		const { $ref } = node as Json;
		if (typeof $ref === "string")
			return inline(definitions[$ref.replace("#/definitions/", "")]);

		return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, inline(value)]));
	};

	return inline(root) as Json;
}

async function stepSchema(stepType: string): Promise<Json> {
	const result = await callTool(await client(), "get_step_schema", { stepType });
	expect(result.isError).toBeFalsy();

	return JSON.parse(textOf(result));
}

describe("advertised tool schemas", () => {
	it.runIf(process.env.MCP_TOOLS_REPORT)("print the size report", async () => {
		const { tools } = await (await client()).listTools();
		const rows = tools
			.map((tool) => ({ input: bytes(tool.inputSchema), name: tool.name, tool: bytes(tool) }))
			.sort((a, b) => b.tool - a.tool);
		const stepSchemas = await Promise.all(
			stepTypeSchema.options.map(async (stepType) => {
				const result = await callTool(await client(), "get_step_schema", { stepType });

				return `${stepType} ${textOf(result).length}`;
			}),
		);
		const total = bytes({ tools });

		console.log(
			[
				`tools/list: ${tools.length} tools, ${total} bytes (~${Math.round(total / 4)} tokens), budget ${MAX_TOOLS_LIST_BYTES}`,
				`budgets per tool: inputSchema ${MAX_INPUT_SCHEMA_BYTES} bytes, tool ${MAX_TOOL_BYTES} bytes`,
				"tool | tool bytes | inputSchema bytes | ~tokens",
				...rows.map(
					(row) =>
						`${row.name} | ${row.tool} | ${row.input} | ${Math.round(row.tool / 4)}`,
				),
				`get_step_schema chars (budget ${MAX_STEP_SCHEMA_CHARS}): ${stepSchemas.join(", ")}`,
			].join("\n"),
		);
	});

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

	it("give every annotated tool a title and all three hints, as OpenAI's app review requires", async () => {
		const { tools } = await (await client()).listTools();
		const annotated = tools.filter((tool) => tool.annotations);

		expect(annotated.map((tool) => tool.name)).toContain("get_step_schema");
		for (const tool of annotated) {
			expect(tool.title, tool.name).toBeTruthy();
			for (const hint of ["destructiveHint", "openWorldHint", "readOnlyHint"] as const) {
				expect(typeof tool.annotations?.[hint], `${tool.name}.${hint}`).toBe("boolean");
			}
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

	it("accept every step type's example and the dashboard's email bodies on every step tool", async () => {
		const { tools } = await (await client()).listTools();
		const validators = new Map(
			tools.map((tool) => [tool.name, ajv.getValidator(tool.inputSchema)]),
		);
		const bodies = Object.values(dashboardEmailBodies).map((body) => ({
			controlValues: { body, editorType: "block", subject: "Hi" },
			type: "email",
		}));
		const examples = await Promise.all(
			stepTypeSchema.options.map(async (type) => ({
				controlValues: (await stepSchema(type)).example,
				type,
			})),
		);

		for (const content of [...bodies, ...examples]) {
			const step = { ...content, name: "Step" };
			const calls: Array<[string, Json]> = [
				["add_workflow_step", { step, workflowId: "welcome" }],
				[
					"insert_workflow_step",
					{ afterStepId: "in-app-step", step, workflowId: "welcome" },
				],
				["create_workflow", { name: "Welcome", steps: [step] }],
				[
					"update_workflow",
					{ name: "Welcome", origin: "external", steps: [step], workflowId: "welcome" },
				],
			];
			if (content.type !== "trigger" && content.type !== "custom") {
				calls.push([
					"update_workflow_step_content",
					{ content, stepId: "s", workflowId: "welcome" },
				]);
			}
			for (const [name, args] of calls) {
				expect(validators.get(name)!(args).valid, `${name} ${content.type}`).toBe(true);
			}
		}
	});

	it("list every top-level controlValues key on its step type's line of the field guide", async () => {
		const { tools } = await (await client()).listTools();
		const addStep = tools.find((tool) => tool.name === "add_workflow_step")!;
		const guide: string = (addStep.inputSchema as Json).properties.step.properties.controlValues
			.description;
		const segments = guide
			.split("\n")
			.flatMap((line) => line.replace(/^- /, "").split(/\. (?=[a-z_]+: )/));

		expect(guide).toContain("skip?");
		for (const stepType of stepTypeSchema.options) {
			const segment = segments.find((candidate) =>
				new RegExp(`^([a-z_]+, )*${stepType}[:,]`).test(candidate),
			);
			expect(segment, stepType).toBeDefined();
			const keys = guideTopLevelKeys(segment!);
			const { schema } = await stepSchema(stepType);
			for (const key of controlKeys(schema).filter((key) => key !== "skip")) {
				expect(keys, `${stepType}.${key}`).toContain(key);
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
		const validate = ajv.getValidator(reference.schema);

		expect(reference.notes).toContain('{ "type": "doc", "content": [blocks] }');
		const sharedNodes = ["paragraph", "button", "columns", "repeat", "inlineImage"];
		for (const node of sharedNodes) {
			expect(reference.schema.definitions, node).toHaveProperty(node);
		}
		for (const node of [...sharedNodes, "variable", "link"]) {
			expect(schemaText.split(`"enum":["${node}"]`).length - 1, node).toBe(1);
		}
		expect(schemaText).toContain("Sender for this step.");
		for (const body of Object.values(dashboardEmailBodies)) {
			expect(validate({ body, editorType: "block", subject: "Hi" })).toMatchObject({
				valid: true,
			});
		}
		const heading = { attrs: { level: 4 }, type: "heading" };
		expect(
			validate({
				body: { content: [heading], type: "doc" },
				editorType: "block",
				subject: "Hi",
			}).valid,
		).toBe(false);
	});

	it.each(workflowStepSchema.options)(
		"lists the same schema as Zod's inline output for $shape.type.value",
		async (option) => {
			const { schema } = await stepSchema(option.shape.type.value);

			expect(inlineDefinitions(schema)).toEqual(
				z.toJSONSchema(option.shape.controlValues, { io: "input", target: "draft-7" }),
			);
		},
	);

	it("names every shared definition after what it describes", async () => {
		for (const stepType of stepTypeSchema.options) {
			const { schema } = await stepSchema(stepType);
			for (const name of Object.keys(schema.definitions ?? {})) {
				expect(name, stepType).toMatch(/^[a-zA-Z]+(_\d+)?$/);
			}
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

		expect(tool.annotations).toEqual({
			destructiveHint: false,
			openWorldHint: false,
			readOnlyHint: true,
		});
	});
});

describe("strict validation behind the advertised schemas", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("rejects an invalid email body node at its path before any request", async () => {
		const api = fakeWorkflowsApi();
		const step = {
			controlValues: {
				body: { content: [{ type: "notANode" }], type: "doc" },
				editorType: "block",
				subject: "Hi",
			},
			name: "Email",
			type: "email",
		};

		const added = await callTool(await client(), "add_workflow_step", {
			step,
			workflowId: "welcome",
		});
		const created = await callTool(await client(), "create_workflow", {
			name: "Welcome",
			steps: [step],
		});

		expect(added.isError).toBe(true);
		expect(textOf(added)).toContain("at step.controlValues.body.content[0].type");
		expect(textOf(created)).toContain("at steps[0].controlValues.body.content[0].type");
		expect(api.requests).toHaveLength(0);
	});

	it("explains a controlValues that is not an object and an image size of the wrong type", async () => {
		const api = fakeWorkflowsApi();
		const image = { attrs: { src: "https://example.com/a.png", width: true }, type: "image" };

		const notAnObject = await callTool(await client(), "add_workflow_step", {
			step: { controlValues: "Hello", name: "SMS", type: "sms" },
			workflowId: "welcome",
		});
		const badSize = await callTool(await client(), "add_workflow_step", {
			step: {
				controlValues: {
					body: { content: [image], type: "doc" },
					editorType: "block",
					subject: "Hi",
				},
				name: "Email",
				type: "email",
			},
			workflowId: "welcome",
		});

		expect(textOf(notAnObject)).toContain(
			"Expected controlValues as an object of the step type's keys, received a string at step.controlValues",
		);
		expect(textOf(badSize)).toContain(
			'Expected a number or a string such as "auto" at step.controlValues.body.content[0].attrs.width',
		);
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
