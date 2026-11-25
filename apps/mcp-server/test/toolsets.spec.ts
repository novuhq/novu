import { describe, expect, it } from "vitest";
import {
	DEFAULT_TOOLSETS,
	getSessionToolsets,
	readRequestedToolsets,
	resolveToolsets,
	TOOLSETS,
	type ToolsetName,
} from "../src/server/toolsets";
import { connectAllTools, tokenAccessors } from "./support";

const ALL_TOOLSETS = Object.keys(TOOLSETS) as ToolsetName[];
const ALWAYS_LOADED = ["get_environments", "submit_feedback", "whoami"];

async function toolNames(toolsets: readonly ToolsetName[]): Promise<string[]> {
	const client = await connectAllTools(tokenAccessors("api-key"), "us", toolsets);
	const { tools } = await client.listTools();

	return tools.map((tool) => tool.name).sort();
}

function fakeStorage(entries: Record<string, unknown> = {}) {
	const values = new Map(Object.entries(entries));

	return {
		async get<T>(key: string) {
			return values.get(key) as T | undefined;
		},
		async put<T>(key: string, value: T) {
			values.set(key, value);
		},
		values,
	};
}

describe("resolveToolsets", () => {
	it.each([null, undefined, "", " , "])("gives the default toolsets for %j", (value) => {
		expect(resolveToolsets(value)).toEqual({ toolsets: DEFAULT_TOOLSETS });
	});

	it("takes comma-separated names in any case, once each, in the registry's order", () => {
		expect(resolveToolsets(" Subscribers, activity,subscribers ")).toEqual({
			toolsets: ["activity", "subscribers"],
		});
	});

	it("expands default and all", () => {
		expect(resolveToolsets("default")).toEqual({ toolsets: DEFAULT_TOOLSETS });
		expect(resolveToolsets("all")).toEqual({ toolsets: ALL_TOOLSETS });
		expect(resolveToolsets("integrations,default")).toEqual({ toolsets: DEFAULT_TOOLSETS });
	});

	it("rejects an unknown name and lists the valid ones", () => {
		const result = resolveToolsets("subscribers,topics");

		expect(result).toEqual({
			error: `Unknown toolset "topics". Use a comma-separated list of: ${ALL_TOOLSETS.join(", ")}, default, all.`,
		});
	});
});

describe("readRequestedToolsets", () => {
	const request = (query: string, method = "POST") =>
		new Request(`https://mcp.example.com/${query}`, { method });

	it("gives the default toolsets for a plain URL", () => {
		expect(readRequestedToolsets(request(""))).toEqual({ toolsets: DEFAULT_TOOLSETS });
	});

	it("reads a repeated parameter like a comma-separated one", () => {
		expect(readRequestedToolsets(request("?toolsets=subscribers&toolsets=activity"))).toEqual({
			toolsets: ["activity", "subscribers"],
		});
	});

	it("answers an unknown toolset with a 400 a browser client can read", async () => {
		const requested = readRequestedToolsets(request("?toolsets=topics"));

		expect(requested).toHaveProperty("rejection");
		const { rejection } = requested as { rejection: Response };
		expect(rejection.status).toBe(400);
		expect(rejection.headers.get("Access-Control-Allow-Origin")).toBe("*");
		expect(await rejection.json()).toEqual({
			error: "invalid_toolsets",
			error_description: expect.stringContaining('Unknown toolset "topics"'),
		});
	});

	it("lets the CORS preflight of an unknown toolset through, so the request itself gets the 400", () => {
		expect(readRequestedToolsets(request("?toolsets=topics", "OPTIONS"))).toEqual({
			toolsets: undefined,
		});
	});
});

describe("toolsets on the hosted server", () => {
	it("puts every tool in exactly one toolset, apart from the ones every selection has", async () => {
		const always = await toolNames([]);
		const perToolset = await Promise.all(
			ALL_TOOLSETS.map(async (toolset) =>
				(await toolNames([toolset])).filter((name) => !always.includes(name)),
			),
		);
		const assigned = perToolset.flat();

		expect(always).toEqual(ALWAYS_LOADED);
		for (const [index, names] of perToolset.entries()) {
			expect(names.length, ALL_TOOLSETS[index]).toBeGreaterThan(0);
		}
		expect(new Set(assigned).size).toBe(assigned.length);
		expect([...always, ...assigned].sort()).toEqual(await toolNames(ALL_TOOLSETS));
	});

	it("lists the default tools in the order clients had before toolsets", async () => {
		const client = await connectAllTools(tokenAccessors("api-key"));
		const names = (await client.listTools()).tools.map((tool) => tool.name);
		// One tool of each registration function, in the order `NovuMCP` registered them before toolsets.
		const firstOfEachModule = [
			"whoami",
			"create_agent",
			"get_conversations",
			"get_workflows",
			"get_environments",
			"find_subscribers",
			"get_subscriber_reachability",
			"get_notifications",
			"get_workflow_runs",
			"get_subscriber_preferences",
			"get_integrations",
			"submit_feedback",
		];

		const positions = firstOfEachModule.map((name) => names.indexOf(name));

		expect(positions).not.toContain(-1);
		expect(positions).toEqual([...positions].sort((a, b) => a - b));
	});

	it("lists only the chosen toolsets and names the others in the instructions", async () => {
		const client = await connectAllTools(tokenAccessors("api-key"), "us", ["subscribers"]);

		const names = (await client.listTools()).tools.map((tool) => tool.name);

		expect(names).toContain("get_subscriber_reachability");
		expect(names).toContain("get_subscriber_preferences");
		expect(names).toContain("whoami");
		expect(names).not.toContain("get_workflows");
		expect(names).not.toContain("get_workflow_runs");
		const instructions = client.getInstructions();
		expect(instructions).toContain("Loaded in this session: subscribers.");
		expect(instructions).toContain("workflows (create, edit, delete and trigger workflows)");
		expect(instructions).toContain("?toolsets=subscribers,activity");
	});

	it("sends no instructions to a session with every toolset", async () => {
		const client = await connectAllTools(tokenAccessors("api-key"), "us", ALL_TOOLSETS);

		expect(client.getInstructions()).toBeUndefined();
	});
});

describe("getSessionToolsets", () => {
	it("keeps the toolsets the session started with when a later request asks for others", async () => {
		const storage = fakeStorage();

		expect(await getSessionToolsets(storage, ["activity"])).toEqual(["activity"]);
		expect(await getSessionToolsets(storage, ["workflows", "agents"])).toEqual(["activity"]);
	});

	it("gives a session that started before toolsets the requested ones, then keeps them", async () => {
		const storage = fakeStorage();

		expect(await getSessionToolsets(storage, undefined)).toEqual(DEFAULT_TOOLSETS);
		expect(await getSessionToolsets(storage, ["activity"])).toEqual(DEFAULT_TOOLSETS);
	});

	it("drops a stored toolset that no longer exists", async () => {
		const storage = fakeStorage({ toolsets: ["activity", "retired"] });

		expect(await getSessionToolsets(storage, ["workflows"])).toEqual(["activity"]);
	});
});
