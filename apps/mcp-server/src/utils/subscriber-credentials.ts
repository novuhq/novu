/** Masks the push tokens and chat webhook URLs that subscriber responses carry, for MCP clients. */

import { asRecord } from "./activity-format";

const VISIBLE_PREFIX = 4;
const MIN_MASK_LENGTH = 4;

/** Partially masks a credential value, revealing only a short prefix (same as the dashboard's Credentials tab). */
export function maskCredentialValue(value: string): string {
	if (!value) {
		return "";
	}

	if (value.length <= VISIBLE_PREFIX) {
		return "•".repeat(value.length);
	}

	const maskLength = Math.max(value.length - VISIBLE_PREFIX, MIN_MASK_LENGTH);

	return `${value.slice(0, VISIBLE_PREFIX)}${"•".repeat(maskLength)}`;
}

/**
 * Masks `deviceTokens` and `webhookUrl` in each subscriber's `channels[].credentials`: one
 * subscriber, a list, or either inside the `{ data }` envelope. Everything else, including the
 * subscriber's custom `data`, is returned as is, so it can be sent back unchanged.
 */
export function maskSubscriberCredentials(value: unknown): unknown {
	const envelope = asRecord(value);
	if (envelope && !isSubscriber(envelope) && "data" in envelope) {
		return { ...envelope, data: maskSubscribers(envelope.data) };
	}

	return maskSubscribers(value);
}

function maskSubscribers(value: unknown): unknown {
	return Array.isArray(value) ? value.map(maskSubscriber) : maskSubscriber(value);
}

function maskSubscriber(value: unknown): unknown {
	const subscriber = asRecord(value);
	if (!subscriber || !Array.isArray(subscriber.channels)) {
		return value;
	}

	return {
		...subscriber,
		channels: subscriber.channels.map((entry) => {
			const channel = asRecord(entry);
			const credentials = asRecord(channel?.credentials);
			if (!channel || !credentials) return entry;

			return { ...channel, credentials: maskChannelCredentials(credentials) };
		}),
	};
}

function maskChannelCredentials(credentials: Record<string, unknown>): Record<string, unknown> {
	const { deviceTokens, webhookUrl } = credentials;

	return {
		...credentials,
		...(Array.isArray(deviceTokens) && {
			deviceTokens: deviceTokens.map((token) =>
				typeof token === "string" ? maskCredentialValue(token) : token,
			),
		}),
		...(typeof webhookUrl === "string" && { webhookUrl: maskCredentialValue(webhookUrl) }),
	};
}

function isSubscriber(record: Record<string, unknown>): boolean {
	return typeof record.subscriberId === "string" || Array.isArray(record.channels);
}
