import {
	gateInitializeWithOAuthProbe,
	handleDiscovery,
	MCP_CORS_HEADERS,
	resolveOAuthContext,
	unauthorizedResponse,
} from "./oauth";
import { REGION_HOSTS } from "./regions";
import type { NovuProps } from "./server/NovuMCP";
import { NovuMCP } from "./server/NovuMCP";
import { assignMcpProps, syncSessionProps } from "./server/props";

export { NovuMCP };

function extractBearerToken(request: Request): string | null {
	const authHeader = request.headers.get("authorization");
	return authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
}

function validateRegion(request: Request, region: string): Response | null {
	const requestedRegion = new URL(request.url).searchParams.get("region");
	if (!requestedRegion || requestedRegion === region) {
		return null;
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
}

async function handleMcpRequest(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	oauth: ReturnType<typeof resolveOAuthContext>,
	props: NovuProps,
): Promise<Response> {
	if (request.method === "OPTIONS") {
		return new Response(null, { headers: MCP_CORS_HEADERS, status: 204 });
	}

	if (!props.token) {
		return unauthorizedResponse(oauth);
	}

	await syncSessionProps(env, request, props);

	const gate = await gateInitializeWithOAuthProbe(request, props.token, env.NOVU_API_URL, oauth);
	if ("reject" in gate) {
		return gate.reject;
	}

	const forwardRequest =
		gate.forwardBody === null
			? request
			: new Request(request.url, {
					body: gate.forwardBody,
					headers: request.headers,
					method: request.method,
				});

	return NovuMCP.serve("/").fetch(forwardRequest, env, ctx);
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const oauth = resolveOAuthContext(env, request);
		const region = env.NOVU_REGION?.trim() || "us";

		const regionError = validateRegion(request, region);
		if (regionError) {
			return regionError;
		}

		const discovery = await handleDiscovery(request, oauth, env);
		if (discovery) {
			return discovery;
		}

		const token = extractBearerToken(request);
		const props: NovuProps = { apiUrl: env.NOVU_API_URL, region, token };
		assignMcpProps(ctx, props);

		const url = new URL(request.url);
		if (url.pathname === "/") {
			return handleMcpRequest(request, env, ctx, oauth, props);
		}

		return Response.redirect("https://docs.novu.co/platform/additional-resources/mcp", 302);
	},
};
