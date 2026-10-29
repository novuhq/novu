import { type OAuthContext, serviceUnavailableResponse, unauthorizedResponse } from "../oauth";
import { isOAuthToken, NovuApiUtils } from "../utils/api";
import type { NovuProps } from "./NovuMCP";

/** Hand per-request session props to the McpAgent Durable Object via `ctx.props`. */
export function assignMcpProps(ctx: ExecutionContext, props: NovuProps): void {
	(ctx as unknown as { props: NovuProps }).props = props;
}

/**
 * Refresh the DO session credential on continuation requests. The agents SDK
 * only calls `_init` at initialize time; this updates the stored token when
 * a client sends a refreshed OAuth access token mid-session.
 *
 * The new token is probed against the Novu API before it replaces the stored
 * one. A bearer that fails the probe gets a rejection, so a leaked session id
 * can't ride on the stored credential.
 *
 * Only runs for initialized sessions — never call `_init` here, that can wake a
 * dormant DO and re-register tools without marking the session initialized.
 */
export async function syncSessionProps(
	env: Env,
	request: Request,
	props: NovuProps,
	oauth: OAuthContext,
): Promise<{ reject: Response } | null> {
	const sessionId = request.headers.get("mcp-session-id");
	if (!sessionId) {
		return null;
	}

	try {
		const id = env.MCP_OBJECT.idFromName(`streamable-http:${sessionId}`);
		const stub = env.MCP_OBJECT.get(id);
		const initialized = (await stub.getInitializeRequest()) !== undefined;
		if (!initialized) {
			return null;
		}

		if ((await stub.getSessionToken()) === props.token) {
			return null;
		}

		const token = props.token as string;
		const probe = await NovuApiUtils.fetchCurrentUser(token, props.apiUrl);
		if (probe.status === 401 || probe.status === 403) {
			return { reject: unauthorizedResponse(oauth, { oauth: isOAuthToken(token) }) };
		}
		if (!probe.ok) {
			return { reject: serviceUnavailableResponse() };
		}

		await stub.updateSessionProps(props);

		return null;
	} catch (error) {
		console.warn("Failed to sync session props:", error);

		return { reject: serviceUnavailableResponse() };
	}
}
