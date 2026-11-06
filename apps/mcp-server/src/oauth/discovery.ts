import {
	AS_METADATA_PATHS,
	DCR_PATH,
	DISCOVERY_CORS_HEADERS,
	type OAuthContext,
	PRM_PATH,
} from "./context";
import { handleDynamicClientRegistration } from "./dcr";
import {
	discoveryJsonResponse,
	discoveryOptionsResponse,
	oauthDisabledResponse,
} from "./responses";
import { OAUTH_SCOPES } from "./scopes";

async function handleAuthorizationServerMetadata(
	request: Request,
	ctx: OAuthContext,
	pathname: string,
): Promise<Response> {
	if (request.method === "OPTIONS") {
		return discoveryOptionsResponse();
	}

	if (ctx.issuer === null) {
		return oauthDisabledResponse();
	}

	try {
		const upstream = await fetch(`${ctx.issuer}${pathname}`, {
			headers: { accept: "application/json" },
		});
		if (!upstream.ok) {
			return new Response(await upstream.text(), {
				headers: { "Content-Type": "application/json", ...DISCOVERY_CORS_HEADERS },
				status: upstream.status,
			});
		}

		const metadata = (await upstream.json()) as Record<string, unknown>;
		metadata.scopes_supported = [...OAUTH_SCOPES];
		metadata.registration_endpoint = `${ctx.origin}${DCR_PATH}`;

		return discoveryJsonResponse(metadata, 200);
	} catch {
		return discoveryJsonResponse(
			{
				error: "server_error",
				error_description: "Failed to fetch authorization server metadata",
			},
			502,
		);
	}
}

function handleProtectedResourceMetadata(ctx: OAuthContext): Response {
	return discoveryJsonResponse(
		{
			authorization_servers: [ctx.origin],
			bearer_methods_supported: ["header"],
			resource: ctx.resource,
			scopes_supported: OAUTH_SCOPES,
		},
		200,
	);
}

export async function handleDiscovery(
	request: Request,
	ctx: OAuthContext,
	env: Env,
): Promise<Response | null> {
	const url = new URL(request.url);
	const { pathname } = url;

	if (pathname === DCR_PATH) {
		return handleDynamicClientRegistration(request, ctx, env);
	}

	if (AS_METADATA_PATHS.includes(pathname as (typeof AS_METADATA_PATHS)[number])) {
		return handleAuthorizationServerMetadata(request, ctx, pathname);
	}

	if (pathname !== PRM_PATH && !pathname.startsWith(`${PRM_PATH}/`)) {
		return null;
	}

	if (request.method === "OPTIONS") {
		return discoveryOptionsResponse();
	}

	if (ctx.issuer === null) {
		return oauthDisabledResponse();
	}

	return handleProtectedResourceMetadata(ctx);
}
