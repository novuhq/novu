import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, type ServeMcp } from "../src/app";

const ORIGIN = "https://mcp.example.com";
const FAPI_URL = "https://clerk.mcp.example.test";
const PUBLISHABLE_KEY = `pk_test_${btoa("clerk.mcp.example.test$")}`;
const API_URL = "https://api.example.test";
const CLERK_VERIFY_URL = "https://api.clerk.com/oauth_applications/access_tokens/verify";
const SCOPES = "user:org:read email profile offline_access";
const PRM_URL = `${ORIGIN}/.well-known/oauth-protected-resource`;

const OAUTH_ENV = {
	CLERK_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
	CLERK_SECRET_KEY: "sk_test_mcp",
	NOVU_API_URL: API_URL,
	NOVU_REGION: "us",
} as Env;

const API_KEY_ONLY_ENV = { NOVU_API_URL: API_URL, NOVU_REGION: "us" } as Env;

const ctx = {
	passThroughOnException() {},
	props: {},
	waitUntil() {},
} as unknown as ExecutionContext;

const INITIALIZE = JSON.stringify({
	id: 1,
	jsonrpc: "2.0",
	method: "initialize",
	params: {
		capabilities: {},
		clientInfo: { name: "test", version: "1" },
		protocolVersion: "2025-06-18",
	},
});

type Route = (init?: RequestInit) => Response | Promise<Response>;

let routes: Record<string, Route>;
let fetchMock: ReturnType<typeof vi.fn>;
let serveMcp: ReturnType<typeof vi.fn<ServeMcp>>;

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		headers: { "Content-Type": "application/json" },
		status,
	});
}

/** What Clerk's Backend API returns for an OAuth access token it issued. */
function clerkToken(aud: string[]) {
	return {
		aud,
		client_id: "client_cursor",
		created_at: 1,
		expiration: null,
		expired: false,
		id: "oat_id_1",
		object: "clerk_idp_oauth_access_token",
		revocation_reason: null,
		revoked: false,
		scopes: SCOPES.split(" "),
		subject: "user_1",
		type: "oauth_token",
		updated_at: 1,
	};
}

function mcpRequest(token?: string, init: RequestInit = {}): Request {
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	if (token) headers.Authorization = `Bearer ${token}`;

	return new Request(`${ORIGIN}/`, { body: INITIALIZE, headers, method: "POST", ...init });
}

function calledUrls(): string[] {
	return fetchMock.mock.calls.map(([url]) => String(url));
}

describe("the MCP server's OAuth", () => {
	beforeEach(() => {
		routes = {};
		fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
			const url = input instanceof Request ? input.url : String(input);
			const route = Object.entries(routes).find(([prefix]) => url.startsWith(prefix));
			if (!route) throw new Error(`Unexpected fetch to ${url}`);
			return route[1](init);
		});
		vi.stubGlobal("fetch", fetchMock);
		// Hono's env(c), which Clerk's handlers read their keys through, returns the
		// Worker bindings only on Workers; under Node it would read process.env.
		vi.stubGlobal("navigator", { userAgent: "Cloudflare-Workers" });
		serveMcp = vi.fn<ServeMcp>(async (request) => json({ forwarded: await request.text() }));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("with Clerk keys", () => {
		const app = () => createApp((...args) => serveMcp(...args));

		it("challenges a request without a token with the resource metadata and scopes", async () => {
			const response = await app().fetch(mcpRequest(), OAUTH_ENV, ctx);

			expect(response.status).toBe(401);
			expect(response.headers.get("WWW-Authenticate")).toBe(
				`Bearer resource_metadata="${PRM_URL}", scope="${SCOPES}"`,
			);
			expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
			expect(response.headers.get("Access-Control-Expose-Headers")).toContain(
				"WWW-Authenticate",
			);
			expect(serveMcp).not.toHaveBeenCalled();
		});

		it("points clients at Clerk in the protected resource metadata", async () => {
			const response = await app().fetch(new Request(PRM_URL), OAUTH_ENV, ctx);

			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({
				authorization_servers: [FAPI_URL],
				bearer_methods_supported: ["header"],
				resource: ORIGIN,
				scopes_supported: SCOPES.split(" "),
			});
			expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
		});

		it("serves the same metadata under a path-suffixed well-known URL", async () => {
			const response = await app().fetch(new Request(`${PRM_URL}/mcp`), OAUTH_ENV, ctx);

			expect(response.status).toBe(200);
			expect(await response.json()).toMatchObject({
				authorization_servers: [FAPI_URL],
				resource: ORIGIN,
			});
		});

		it("relays Clerk's authorization server metadata unchanged", async () => {
			const metadata = {
				issuer: FAPI_URL,
				registration_endpoint: `${FAPI_URL}/oauth/register`,
				token_endpoint: `${FAPI_URL}/oauth/token`,
			};
			routes[`${FAPI_URL}/.well-known/oauth-authorization-server`] = () => json(metadata);

			const response = await app().fetch(
				new Request(`${ORIGIN}/.well-known/oauth-authorization-server`),
				OAUTH_ENV,
				ctx,
			);

			expect(response.status).toBe(200);
			expect(await response.json()).toEqual(metadata);
		});

		it("forwards a request whose OAuth token Clerk verified for this server, without probing the API", async () => {
			routes[CLERK_VERIFY_URL] = () => json(clerkToken([`${ORIGIN}/`]));

			const response = await app().fetch(mcpRequest("oat_valid"), OAUTH_ENV, ctx);

			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({ forwarded: INITIALIZE });
			expect(calledUrls()).toEqual([CLERK_VERIFY_URL]);
			expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
				access_token: "oat_valid",
			});
			expect(serveMcp.mock.calls[0][2]).toBe(ctx);
			expect((ctx as unknown as { props: unknown }).props).toEqual({
				apiUrl: API_URL,
				region: "us",
				token: "oat_valid",
			});
		});

		it("accepts a token whose audience is the origin without the trailing slash", async () => {
			routes[CLERK_VERIFY_URL] = () => json(clerkToken([ORIGIN]));

			const response = await app().fetch(mcpRequest("oat_valid"), OAUTH_ENV, ctx);

			expect(response.status).toBe(200);
		});

		it("rejects a token Clerk issued for another resource", async () => {
			routes[CLERK_VERIFY_URL] = () => json(clerkToken(["https://other.example.com"]));
			vi.spyOn(console, "warn").mockImplementation(() => {});

			const response = await app().fetch(mcpRequest("oat_other_audience"), OAUTH_ENV, ctx);

			expect(response.status).toBe(401);
			expect(response.headers.get("WWW-Authenticate")).toBe(
				`Bearer resource_metadata="${PRM_URL}", error="invalid_token", scope="${SCOPES}"`,
			);
			expect(serveMcp).not.toHaveBeenCalled();
		});

		it("rejects a token Clerk doesn't know", async () => {
			routes[CLERK_VERIFY_URL] = () =>
				json(
					{
						errors: [
							{
								code: "resource_not_found",
								long_message: "not found",
								message: "not found",
							},
						],
					},
					404,
				);

			const response = await app().fetch(mcpRequest("oat_unknown"), OAUTH_ENV, ctx);

			expect(response.status).toBe(401);
			expect(response.headers.get("WWW-Authenticate")).toContain('error="invalid_token"');
			expect(serveMcp).not.toHaveBeenCalled();
		});

		it("answers a server error, not a challenge, when Clerk can't verify the token", async () => {
			routes[CLERK_VERIFY_URL] = () =>
				json({ errors: [{ code: "internal_error", message: "boom" }] }, 503);
			vi.spyOn(console, "error").mockImplementation(() => {});

			const response = await app().fetch(mcpRequest("oat_during_outage"), OAUTH_ENV, ctx);

			expect(response.status).toBe(503);
			expect(response.headers.get("WWW-Authenticate")).toBeNull();
			expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
		});

		it("probes the API with an API key on initialize instead of asking Clerk", async () => {
			routes[`${API_URL}/v1/users/me`] = () => json({ data: { _id: "user" } });

			const response = await app().fetch(mcpRequest("novu-api-key"), OAUTH_ENV, ctx);

			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({ forwarded: INITIALIZE });
			expect(calledUrls()).toEqual([`${API_URL}/v1/users/me`]);
			expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
				Authorization: "ApiKey novu-api-key",
			});
		});

		it("rejects a bad API key without offering OAuth", async () => {
			routes[`${API_URL}/v1/users/me`] = () => json({ message: "Unauthorized" }, 401);

			const response = await app().fetch(mcpRequest("bad-api-key"), OAUTH_ENV, ctx);

			expect(response.status).toBe(401);
			expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
			expect(serveMcp).not.toHaveBeenCalled();
		});

		it("answers the CORS preflight on the MCP endpoint", async () => {
			const response = await app().fetch(
				new Request(`${ORIGIN}/`, { method: "OPTIONS" }),
				OAUTH_ENV,
				ctx,
			);

			expect(response.status).toBe(204);
			expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
		});
	});

	describe("without Clerk keys (self-hosted)", () => {
		const app = () => createApp((...args) => serveMcp(...args));

		it("challenges a request without a token with no OAuth metadata", async () => {
			const response = await app().fetch(mcpRequest(), API_KEY_ONLY_ENV, ctx);

			expect(response.status).toBe(401);
			expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
		});

		it("hides the discovery endpoints", async () => {
			const prm = await app().fetch(new Request(PRM_URL), API_KEY_ONLY_ENV, ctx);
			const asMetadata = await app().fetch(
				new Request(`${ORIGIN}/.well-known/oauth-authorization-server`),
				API_KEY_ONLY_ENV,
				ctx,
			);

			expect(prm.status).toBe(404);
			expect(asMetadata.status).toBe(404);
		});

		it("treats every token as an API key", async () => {
			routes[`${API_URL}/v1/users/me`] = () => json({ data: { _id: "user" } });

			const response = await app().fetch(mcpRequest("novu-api-key"), API_KEY_ONLY_ENV, ctx);

			expect(response.status).toBe(200);
			expect(calledUrls()).toEqual([`${API_URL}/v1/users/me`]);
		});
	});

	it("rejects a region this deployment doesn't serve", async () => {
		const response = await createApp(serveMcp).fetch(
			new Request(`${ORIGIN}/?region=eu`, { method: "POST" }),
			OAUTH_ENV,
			ctx,
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ error: "invalid_region" });
	});

	it("sends any other path to the docs", async () => {
		const response = await createApp(serveMcp).fetch(
			new Request(`${ORIGIN}/oauth/register`, { method: "POST" }),
			OAUTH_ENV,
			ctx,
		);

		expect(response.status).toBe(302);
		expect(response.headers.get("Location")).toBe(
			"https://docs.novu.co/platform/additional-resources/mcp",
		);
	});
});
