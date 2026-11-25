/** How the subscriber's preferences, and critical workflows that ignore them, change a channel's verdict. */

import {
	CHANNEL_LABELS,
	describeReadFailure,
	pluralize,
	type SubscriberReachabilityInput,
	type Verdict,
} from "./reachability-model";

/** Channels whose non-critical steps wait for, or skip outside, the subscriber's schedule. */
const SCHEDULED_CHANNELS = "email, SMS, push and chat";

const MAX_LISTED_NAMES = 5;

/**
 * Workflow entries carry the merged value per workflow (workflow defaults, then the subscriber's
 * global and workflow choices), so they decide; the global entry only decides when no active
 * workflow uses the channel. A missing channel key means no step uses it, not that it is off.
 */
export function applyPreferences(v: Verdict, input: SubscriberReachabilityInput): void {
	const { criticalPreferences, preferences } = input;
	const failure = input.failures?.preferences;
	if (failure) {
		if (v.blockers.length === 0) {
			v.unknowns.push(describeReadFailure("preferences", failure));
		}

		return;
	}

	if (!preferences) return;

	const { channel } = v;
	const globalOffReason =
		preferences.global?.enabled === false
			? "All notifications off globally"
			: preferences.global?.channels?.[channel] === false
				? "Off globally"
				: undefined;

	const workflows = (preferences.workflows ?? []).filter(
		(workflow) => workflow.channels?.[channel] !== undefined,
	);
	const off = workflows.filter(
		(workflow) => workflow.enabled === false || workflow.channels?.[channel] === false,
	);

	// Critical workflows ignore subscriber preferences, so they still send on a channel the subscriber turned off.
	const criticalSending = (criticalPreferences?.workflows ?? []).filter(
		(workflow) => workflow.channels?.[channel] === true,
	);
	const preferencesBlock = (reason: string) => {
		if (criticalSending.length > 0) {
			v.partial.push(
				`${reason}, but critical workflows still send: ${listNames(criticalSending)}`,
			);
		} else {
			v.blockers.push(reason);
		}
	};

	if (workflows.length === 0) {
		if (globalOffReason) preferencesBlock(globalOffReason);

		return;
	}

	if (off.length === workflows.length) {
		preferencesBlock(
			globalOffReason ??
				`Off for all ${workflows.length} ${pluralize(workflows.length, "workflow")} that use ${CHANNEL_LABELS[channel]}`,
		);

		return;
	}

	if (off.length > 0) {
		v.partial.push(
			`Off for ${off.length} ${pluralize(off.length, "workflow")}: ${listNames(off)}`,
		);
	}

	if (globalOffReason) {
		v.details.push(
			`${globalOffReason}, but turned back on for ${workflows.length - off.length} ${pluralize(workflows.length - off.length, "workflow")}`,
		);
	}
}

export function preferenceNotes(input: SubscriberReachabilityInput): string[] {
	const notes: string[] = [];
	const failures = input.failures ?? {};

	const critical = input.criticalPreferences?.workflows ?? [];
	if (failures.criticalPreferences) {
		notes.push(describeReadFailure("criticalPreferences", failures.criticalPreferences));
	} else if (critical.length > 0) {
		notes.push(`Critical workflows ignore preferences: ${listNames(critical)}`);
	}

	if (input.preferences?.global?.schedule?.isEnabled) {
		notes.push(
			`A delivery schedule is on: non-critical ${SCHEDULED_CHANNELS} steps outside it are skipped or wait for it`,
		);
	}

	return notes;
}

function listNames(
	workflows: Array<{ workflow?: { name?: string; identifier?: string } }>,
): string {
	const names = workflows.map(
		(workflow) => workflow.workflow?.name ?? workflow.workflow?.identifier ?? "unnamed",
	);
	const listed = names.slice(0, MAX_LISTED_NAMES).join(", ");

	return names.length > MAX_LISTED_NAMES
		? `${listed} and ${names.length - MAX_LISTED_NAMES} more`
		: listed;
}
