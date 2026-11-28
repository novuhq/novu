import { type Context, Hono, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import {
	type AppEnv,
	authenticate,
	authorizationServerMetadata,
	protectedResourceMetadata,
	requireOAuth,
} from "./auth";
import { REGION_HOSTS } from "./regions";
import type { NovuProps } from "./server/NovuMCP";
import { assignMcpProps, syncSessionProps } from "./server/props";

/** Forwards an MCP request to the session's Durable Object. */
export type ServeMcp = (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>;

const PRM_PATH = "/.well-known/oauth-protected-resource";
const AS_METADATA_PATHS = [
	"/.well-known/oauth-authorization-server",
	"/.well-known/openid-configuration",
];
const DOCS_URL = "https://docs.novu.co/platform/additional-resources/mcp";

function resolveRegion(env: Env): string {
	return env.NOVU_REGION?.trim() || "us";
}

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

	return Response.json(
		{ error: "invalid_region", error_description: description },
		{ status: 400 },
	);
};

function handleMcpRequest(serveMcp: ServeMcp) {
	return async (c: Context<AppEnv>): Promise<Response> => {
		// Hono types the Worker's own context with a narrower interface of its own.
		const ctx = c.executionCtx as ExecutionContext;
		const props: NovuProps = {
			apiUrl: c.env.NOVU_API_URL,
			region: resolveRegion(c.env),
			token: c.get("token"),
		};
		assignMcpProps(ctx, props);

		await syncSessionProps(c.env, c.req.raw, props);

		return serveMcp(c.req.raw, c.env, ctx);
	};
}

export function createApp(serveMcp: ServeMcp): Hono<AppEnv> {
	const app = new Hono<AppEnv>();

	app.use(
		"*",
		cors({
			allowHeaders: [
				"Authorization",
				"Content-Type",
				"mcp-session-id",
				"mcp-protocol-version",
			],
			allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
			// Browser-based MCP clients can only start sign-in if they can read the challenge.
			exposeHeaders: ["mcp-session-id", "WWW-Authenticate"],
			maxAge: 86400,
			origin: "*",
		}),
	);
	app.use("*", validateRegion);

	app.on("GET", [PRM_PATH, `${PRM_PATH}/*`], requireOAuth, protectedResourceMetadata);
	app.on("GET", AS_METADATA_PATHS, requireOAuth, authorizationServerMetadata);

	app.all("/", authenticate, handleMcpRequest(serveMcp));

	app.all("*", () => Response.redirect(DOCS_URL, 302));

	return app;
}
