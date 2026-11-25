/**
 * A subscriber as `GET /v2/subscribers/:id` returns it, with a push token and a chat webhook in
 * `channels[].credentials`, custom data and a phone number: everything the tools must not leak.
 */
export function rawSubscriber(overrides: Record<string, unknown> = {}) {
	return {
		_environmentId: "env-1",
		channels: [
			{
				credentials: { deviceTokens: ["fcm-token-secret-1", "fcm-token-secret-2"] },
				providerId: "fcm",
			},
			{
				credentials: { webhookUrl: "https://hooks.slack.com/services/SECRET" },
				providerId: "slack",
			},
		],
		data: { plan: "enterprise-secret-data" },
		email: "jane@acme.com",
		firstName: "Jane",
		isOnline: false,
		lastName: "Alvarez",
		lastOnlineAt: "2026-11-22T10:00:00.000Z",
		phone: "+15550001234",
		subscriberId: "sub_8f21",
		...overrides,
	};
}
