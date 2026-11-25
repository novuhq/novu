/** Wording shared by the subscriber reachability modules, kept here so they don't import each other. */

import type {
	ReachabilityChannel,
	ReachabilitySource,
	ReadFailure,
} from "./subscriber-reachability";

export const CONDITIONS_REASON = "Only for triggers that match the integration's conditions";

export const CHANNEL_LABELS: Record<ReachabilityChannel, string> = {
	chat: "chat",
	email: "email",
	in_app: "in-app",
	push: "push",
	sms: "SMS",
	tool: "tool",
};

export const SOURCE_LABELS: Record<ReachabilitySource, string> = {
	connections: "channel connections",
	criticalPreferences: "critical workflows",
	endpoints: "channel endpoints",
	integrations: "integrations",
	preferences: "preferences",
};

export function describeReadFailure(source: ReachabilitySource, failure: ReadFailure): string {
	const label = SOURCE_LABELS[source];
	if (failure.status === undefined) return `Couldn't check ${label} (request failed)`;
	if (failure.status === 403) return `Couldn't check ${label} (403: missing permission)`;
	if (failure.status === 401) return `Couldn't check ${label} (401: not authorized)`;

	return `Couldn't check ${label} (${failure.status})`;
}

export function pluralize(count: number, word: string): string {
	return count === 1 ? word : `${word}s`;
}
