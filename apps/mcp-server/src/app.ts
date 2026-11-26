import {
	authorizationServerMetadataHandler,
	mcpAuth,
	protectedResourceMetadataHandler,
} from "@clerk/mcp-tools/hono";
import { Hono, type MiddlewareHandler } from "hono";
import {
	AS_METADATA_PATHS,
	apiKeyUnauthorizedResponse,
	clerkAuthOptions,
	gateInitializeWithApiKeyProbe,
	isOAuthEnabled,
	MCP_CORS_HEADERS,
	oauthDisabledResponse,
	PRM_PATH,
} from "./oauth";
import { REGION_HOSTS } from "./regions";
import type { NovuProps } from "./server/NovuMCP";
import { assignMcpProps, syncSessionProps } from "./server/props";
import { isOAuthToken } from "./utils/api";

/** Forwards an MCP request to the session's Durable Object. */
export type ServeMcp = (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>;

type AppEnv = { Bindings: Env };

const DOCS_URL = "https://docs.novu.co/platform/additional-resources/mcp";

function extractBearerToken(request: Request): string | null {
	const authHeader = request.headers.get("authorization");
	return authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
}

function resolveRegion(env: Env): string {
	return env.NOVU_REGION?.trim() || "us";
}

/** Memoizes one Clerk handler per origin; each deployment answers on one host. */
function perOrigin<T>(build: (origin: string) => T): (origin: string) => T {
	const built = new Map<string, T>();
	return (origin) => {
		let value = built.get(origin);
		if (value === undefined) {
			value = build(origin);
			built.set(origin, value);
		}
		return value;
	};
}

const clerkAuth = perOrigin((origin) => mcpAuth(clerkAuthOptions(origin)));
const protectedResourceMetadata = perOrigin((origin) =>
	protectedResourceMetadataHandler(clerkAuthOptions(origin)),
);
const authorizationServerMetadata = authorizationServerMetadataHandler();

const validateRegion: MiddlewareHandler<AppEnv> = async (c, next) => {
	const region = resolveRegion(c.env);
	const requestedRegion = c.req.query("region");
	if (!requestedRegion || requestedRegion === region) {
		return next();
	}

	const host = REGION_HOSTS[requestedRegion];
	const description = host
		? `This deployment serves the "${region}" region. To use "${requestedRegion}", connect to ${host} instead.`
		: `This deployment serves the "${region}" region and does not support region="${requestedRegion}".`;

	return new Response(
		JSON.stringify({ error: "invalid_region", error_description: description }),
		{
			headers: { "Content-Type": "application/json", ...MCP_CORS_HEADERS },
			status: 400,
		},
	);
};

/**
 * Answers the CORS preflight and adds the CORS headers to `mcpAuth`'s
 * challenges. The Durable Object's responses already carry them.
 */
const mcpCors: MiddlewareHandler<AppEnv> = async (c, next) => {
	if (c.req.method === "OPTIONS") {
		return new Response(null, { headers: MCP_CORS_HEADERS, status: 204 });
	}

	await next();

	if (!c.res.headers.has("Access-Control-Allow-Origin")) {
		for (const [name, value] of Object.entries(MCP_CORS_HEADERS)) {
			c.res.headers.set(name, value);
		}
	}
};

/**
 * Clerk's `mcpAuth` verifies OAuth access tokens, audience included, and sends
 * the 401 challenge when there is no token. Novu API keys share the `Bearer`
 * scheme, so any token that isn't a Clerk OAuth token goes on to the API-key
 * probe instead.
 */
const authenticate: MiddlewareHandler<AppEnv> = async (c, next) => {
	const token = extractBearerToken(c.req.raw);

	if (!isOAuthEnabled(c.env)) {
		return token ? next() : apiKeyUnauthorizedResponse();
	}

	if (token && !isOAuthToken(token)) {
		return next();
	}

	return clerkAuth(new URL(c.req.url).origin)(c, next);
};

function handleMcpRequest(serveMcp: ServeMcp) {
	return async (c: Parameters<MiddlewareHandler<AppEnv>>[0]): Promise<Response> => {
		// Hono types the Worker's own context with a narrower interface of its own.
		const ctx = c.executionCtx as ExecutionContext;
		const token = extractBearerToken(c.req.raw);
		const props: NovuProps = {
			apiUrl: c.env.NOVU_API_URL,
			region: resolveRegion(c.env),
			token,
		};
		assignMcpProps(ctx, props);

		await syncSessionProps(c.env, c.req.raw, props);

		let request = c.req.raw;
		// Set only when `mcpAuth` verified a Clerk token; any other token is an API key.
		if (token && !c.get("mcpAuth")) {
			const gate = await gateInitializeWithApiKeyProbe(request, token, c.env.NOVU_API_URL);
			if ("reject" in gate) {
				return gate.reject;
			}
			if (gate.forwardBody !== null) {
				request = new Request(request.url, {
					body: gate.forwardBody,
					headers: request.headers,
					method: request.method,
				});
			}
		}

		return serveMcp(request, c.env, ctx);
	};
}

export function createApp(serveMcp: ServeMcp): Hono<AppEnv> {
	const app = new Hono<AppEnv>();

	app.use("*", validateRegion);

	// Points clients at Clerk, which handles registration (Client ID Metadata
	// Documents or dynamic registration), consent and tokens.
	app.on(["GET", "OPTIONS"], [PRM_PATH, `${PRM_PATH}/*`], (c) =>
		isOAuthEnabled(c.env)
			? protectedResourceMetadata(new URL(c.req.url).origin)(c)
			: oauthDisabledResponse(),
	);

	// Clerk's own metadata, for clients that look for it on the MCP host.
	app.on(["GET", "OPTIONS"], [...AS_METADATA_PATHS], (c) =>
		isOAuthEnabled(c.env) ? authorizationServerMetadata(c) : oauthDisabledResponse(),
	);

	app.all("/", mcpCors, authenticate, handleMcpRequest(serveMcp));

	app.all("*", () => Response.redirect(DOCS_URL, 302));

	return app;
}
