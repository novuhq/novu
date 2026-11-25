import { vi } from "vitest";
import { workflowResponseFixture } from "./fixtures/workflow-response";

type Json = Record<string, any>;

export interface RecordedRequest {
	method: string;
	path: string;
	headers: Headers;
	body?: Json;
}

/**
 * A stand-in for `GET` / `PUT` / `POST /v2/workflows` that stores one
 * workflow in memory, the way the API echoes the saved workflow back.
 * `respond` lets a test fail the next matching call.
 */
export function fakeWorkflowsApi(initial: Json = workflowResponseFixture()) {
	let workflow: Json = structuredClone(initial);
	const requests: RecordedRequest[] = [];
	const failures: Array<{ method: string; status: number; body: unknown; headers?: Json }> = [];

	const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
		const { pathname } = new URL(url);
		const method = init?.method ?? "GET";
		const body = init?.body ? JSON.parse(String(init.body)) : undefined;
		requests.push({ body, headers: new Headers(init?.headers), method, path: pathname });

		const failureIndex = failures.findIndex((failure) => failure.method === method);
		if (failureIndex !== -1) {
			const [failure] = failures.splice(failureIndex, 1);

			return json(failure.body, failure.status, failure.headers);
		}

		if (method === "GET") return json({ data: workflow });
		if (method === "PUT" || method === "POST") {
			workflow = saved(method === "POST" ? { ...body, _id: "new-id" } : body, workflow);

			return json({ data: workflow }, method === "POST" ? 201 : 200);
		}

		return json({ message: "unexpected" }, 500);
	});
	vi.stubGlobal("fetch", fetchMock);

	return {
		failNext(
			method: string,
			status: number,
			body: unknown = { message: "failed" },
			headers?: Json,
		) {
			failures.push({ body, headers, method, status });
		},
		get puts() {
			return requests.filter((request) => request.method === "PUT");
		},
		requests,
		get workflow() {
			return workflow;
		},
	};
}

/** A whole response for `stubApi`, made with `respond`. */
class CannedResponse {
	constructor(
		readonly status: number,
		readonly body: unknown,
	) {}
}

/** A route that answers with this status and body, without the `{ data }` envelope. */
export function respond(status: number, body: unknown): CannedResponse {
	return new CannedResponse(status, body);
}

/**
 * Canned answers by path plus query string, or by path: data the API wraps in `{ data }`, or a
 * `respond(status, body)`.
 */
export type Routes = Record<string, unknown>;

/** Stubs `fetch` with canned answers; any other request gets a 500. */
export function stubApi(routes: Routes) {
	const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
		const { pathname, search } = new URL(url);
		const route = routes[`${pathname}${search}`] ?? routes[pathname];
		if (route === undefined) return json({ message: `unexpected ${pathname}${search}` }, 500);
		if (route instanceof CannedResponse) return json(route.body, route.status);

		return json({ data: route });
	});
	vi.stubGlobal("fetch", fetchMock);

	return fetchMock;
}

function saved(body: Json, previous: Json): Json {
	return {
		...previous,
		...body,
		preferences: { default: body.preferences?.workflow, user: body.preferences?.user },
		steps: (body.steps ?? []).map((step: Json, index: number) => ({
			...step,
			_id: step._id ?? `step-${index}`,
			stepId: step.stepId ?? step.name.toLowerCase().replace(/\W+/g, "-"),
		})),
		workflowId: body.workflowId ?? previous.workflowId,
	};
}

function json(body: unknown, status = 200, headers: Json = {}) {
	return new Response(JSON.stringify(body), {
		headers: { "Content-Type": "application/json", ...headers },
		status,
	});
}
