import { NovuApiUtils } from "../utils/api";
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
 * one, so an invalid bearer can never clobber a working session credential.
 *
 * Only runs for initialized sessions — never call `_init` here, that can wake a
 * dormant DO and re-register tools without marking the session initialized.
 */
export async function syncSessionProps(
	env: Env,
	request: Request,
	props: NovuProps,
): Promise<void> {
	const sessionId = request.headers.get("mcp-session-id");
	if (!sessionId) {
		return;
	}

	try {
		const id = env.MCP_OBJECT.idFromName(`streamable-http:${sessionId}`);
		const stub = env.MCP_OBJECT.get(id);
		const initialized = (await stub.getInitializeRequest()) !== undefined;
		if (!initialized) {
			return;
		}

		if ((await stub.getSessionToken()) === props.token) {
			return;
		}

		const probe = await NovuApiUtils.fetchCurrentUser(props.token as string, props.apiUrl);
		if (!probe.ok) {
			return;
		}

		await stub.updateSessionProps(props);
	} catch (error) {
		// Non-fatal — serve() still forwards with ctx.props on initialize.
		console.warn("Failed to sync session props:", error);
	}
}
