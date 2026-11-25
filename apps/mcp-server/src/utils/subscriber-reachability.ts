/**
 * Which channels can reach one subscriber, and why not, from data the Novu API already returns.
 * The rules mirror the worker's send path (`apps/worker/src/app/workflow/usecases/send-message`),
 * so keep them in step when it changes. Pure: the tool in `tools/subscriber-reachability.ts`
 * reads the API and drops every credential before calling this.
 *
 * This module runs one rule per channel (`CHANNEL_RULES`) and holds the email, SMS and in-app
 * rules. Push, chat and tool routes are in `reachability-routes.ts`, preferences in
 * `reachability-preferences.ts`, and the types in `reachability-model.ts`.
 *
 * The result never carries a phone number, custom data or credential values, only whether
 * each is present.
 */

import {
	CHANNEL_LABELS,
	CONDITIONS_REASON,
	describeReadFailure,
	REACHABILITY_SOURCES,
	type ReachabilityChannel,
	type ReachabilitySubscriber,
	type RuleContext,
	SOURCE_LABELS,
	type SubscriberReachabilityCandidate,
	type SubscriberReachabilityInput,
	type SubscriberReachabilityResult,
	Verdict,
} from "./reachability-model";
import { applyPreferences, preferenceNotes } from "./reachability-preferences";
import { chatChannel, pushChannel, toolChannel, toolInUse } from "./reachability-routes";

interface ChannelRule {
	channel: ReachabilityChannel;
	/** Runs before the integrations check, so what it finds stands whatever the integrations say. */
	precheck?: (v: Verdict, ctx: RuleContext) => void;
	/** Whether the channel is reported at all; it is when this is absent. */
	applies?: (ctx: RuleContext) => boolean;
	/** Runs only when the channel has an active integration. */
	evaluate?: (v: Verdict, ctx: RuleContext) => void;
}

/** One rule per channel, in the order the result lists them. */
const CHANNEL_RULES: ChannelRule[] = [
	{
		channel: "email",
		evaluate: primaryIntegration,
		precheck: requireDestination("No email address", (subscriber) => Boolean(subscriber.email)),
	},
	{ channel: "in_app", precheck: inboxPresence },
	{
		channel: "sms",
		evaluate: primaryIntegration,
		precheck: requireDestination("No phone number", (subscriber) => subscriber.hasPhone),
	},
	{ channel: "push", evaluate: pushChannel },
	{ channel: "chat", evaluate: chatChannel },
	{ applies: toolInUse, channel: "tool", evaluate: toolChannel },
];

/** Integrations workflows never send through (SelectIntegration `isHiddenFromWorkflows`). */
const HIDDEN_FROM_WORKFLOWS_PROVIDERS = ["agent-email-inbox"];

/** The dashboard's subscriber page, as a path under `/env/<environment>`. */
export function subscriberDashboardPath(subscriberId: string): string {
	return `/subscribers/${encodeURIComponent(subscriberId)}`;
}

/** One of several subscribers a search matched, for the caller to choose from. */
export function subscriberCandidate(
	subscriber: ReachabilitySubscriber,
): SubscriberReachabilityCandidate {
	return {
		dashboardPath: subscriberDashboardPath(subscriber.subscriberId),
		email: subscriber.email || null,
		name: subscriberDisplayName(subscriber),
		subscriberId: subscriber.subscriberId,
	};
}

function subscriberDisplayName(subscriber: {
	firstName?: string | null;
	lastName?: string | null;
}): string | null {
	const name = [subscriber.firstName, subscriber.lastName]
		.map((part) => part?.trim())
		.filter(Boolean)
		.join(" ");

	return name || null;
}

export function computeSubscriberReachability(
	input: SubscriberReachabilityInput,
): Extract<SubscriberReachabilityResult, { status: "found" }> {
	const { subscriber } = input;

	return {
		channels: CHANNEL_RULES.flatMap((rule) => runRule(rule, input)?.toResult() ?? []),
		checked: checkedSources(input),
		dashboardPath: subscriberDashboardPath(subscriber.subscriberId),
		environmentId: subscriber.environmentId ?? null,
		notes: preferenceNotes(input),
		status: "found",
		subscriber: {
			email: subscriber.email || null,
			hasPhone: subscriber.hasPhone,
			lastOnlineAt: subscriber.lastOnlineAt ?? null,
			name: subscriberDisplayName(subscriber),
			subscriberId: subscriber.subscriberId,
		},
	};
}

/** The channel's verdict, or nothing when the rule doesn't apply to this subscriber. */
function runRule(rule: ChannelRule, input: SubscriberReachabilityInput): Verdict | undefined {
	const ctx: RuleContext = {
		active: input.integrations.filter(
			(integration) =>
				integration.active &&
				integration.channel === rule.channel &&
				!HIDDEN_FROM_WORKFLOWS_PROVIDERS.includes(integration.providerId),
		),
		input,
	};
	if (rule.applies && !rule.applies(ctx)) return undefined;

	const v = new Verdict(rule.channel);
	rule.precheck?.(v, ctx);
	if (requireActiveIntegration(v, ctx)) rule.evaluate?.(v, ctx);
	applyPreferences(v, input);

	return v;
}

/** An unreadable integration list leaves the channel unknown, and an empty one blocks it. */
function requireActiveIntegration(v: Verdict, { active, input }: RuleContext): boolean {
	const failure = input.failures?.integrations;
	if (failure) {
		v.unknowns.push(describeReadFailure("integrations", failure));

		return false;
	}

	if (active.length === 0) {
		v.blockers.push(`No active ${CHANNEL_LABELS[v.channel]} integration`);

		return false;
	}

	return true;
}

/** Email and SMS block without the subscriber's address, whatever the integrations say. */
function requireDestination(
	missing: string,
	hasDestination: (subscriber: ReachabilitySubscriber) => boolean,
): (v: Verdict, ctx: RuleContext) => void {
	return (v, { input }) => {
		if (!hasDestination(input.subscriber)) v.blockers.push(missing);
	};
}

/** Email and SMS send through the environment's active primary integration (SelectIntegration). */
function primaryIntegration(v: Verdict, { active }: RuleContext): void {
	const primary = active.find((integration) => integration.primary);
	if (primary) {
		v.details.push(`Sends with ${primary.providerId}`);
	} else if (active.some((integration) => integration.hasConditions || integration.hasRules)) {
		// Without a primary to fall back to, a trigger that matches no integration's conditions isn't sent.
		v.partial.push(CONDITIONS_REASON);
	} else {
		v.blockers.push(`No primary ${CHANNEL_LABELS[v.channel]} integration`);
	}
}

/** In-app: when the subscriber last used the Inbox, whatever the integrations say. */
function inboxPresence(v: Verdict, { input: { subscriber } }: RuleContext): void {
	if (subscriber.isOnline) v.details.push("Online now");
	else if (subscriber.lastOnlineAt) v.details.push(`Last seen ${subscriber.lastOnlineAt}`);
	else v.details.push("Never opened the Inbox");
}

/** The sources the verdicts rest on: each read that succeeded, and connections once every lookup settled. */
function checkedSources(input: SubscriberReachabilityInput): string[] {
	const failures = input.failures ?? {};
	const lookups = input.endpoints.flatMap((endpoint) => endpoint.connection ?? []);
	// Found or gone (404) both settle a connection; a failed or skipped lookup leaves it unchecked.
	const connectionsRead =
		lookups.length > 0 &&
		lookups.every((lookup) => lookup.status === "found" || lookup.status === "missing");

	return [
		"profile",
		...REACHABILITY_SOURCES.filter((source) =>
			source === "connections" ? connectionsRead : !failures[source],
		).map((source) => SOURCE_LABELS[source]),
	];
}
