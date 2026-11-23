export type {
	DelayType,
	DigestType,
	EditorType,
	HttpMethod,
	RedirectTarget,
	Severity,
	StepType,
	ThrottleType,
	TimeUnit,
	WorkflowStep,
} from "../utils/workflow-schemas";

export interface ChannelPreferences {
	email: boolean;
	sms: boolean;
	in_app: boolean;
	push: boolean;
	chat: boolean;
}

export interface UpdatePreferencesRequest {
	channels: ChannelPreferences;
	workflowId?: string;
}

export interface TriggerWorkflowRequest {
	name: string;
	to: Array<{ subscriberId: string }>;
	payload: Record<string, any>;
	overrides?: Record<string, { integrationIdentifier: string }>;
}

export interface ApiResponse {
	content: Array<{ type: "text"; text: string }>;
	[key: string]: unknown;
}

export interface NovuApiHeaders {
	Authorization: string;
	"Content-Type": string;
	"idempotency-key"?: string;
	[key: string]: string | undefined;
}

export interface FindSubscribersParams {
	email?: string;
	name?: string;
	phone?: string;
	subscriberId?: string;
}

export interface GetNotificationsParams {
	channels?: string[];
	templates?: string[];
	emails?: string[];
	subscriberIds?: string[];
	page?: number;
	limit?: number;
	transactionId?: string;
	topicKey?: string;
	after?: string;
	before?: string;
}
