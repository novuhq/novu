import { describe, expect, it } from "vitest";
import { handleDiscovery } from "../src/oauth";

const ctx = {
	issuer: "https://clerk.example.com",
	origin: "https://mcp.example.com",
	prmUrl: "https://mcp.example.com/.well-known/oauth-protected-resource",
	resource: "https://mcp.example.com/mcp",
};

describe("OAuth discovery", () => {
	it("lets a browser POST a client registration after the CORS preflight", async () => {
		const response = await handleDiscovery(
			new Request("https://mcp.example.com/oauth/register", { method: "OPTIONS" }),
			ctx,
			{} as Env,
		);

		expect(response?.status).toBe(204);
		expect(response?.headers.get("Access-Control-Allow-Methods")?.split(", ")).toContain(
			"POST",
		);
	});
});
