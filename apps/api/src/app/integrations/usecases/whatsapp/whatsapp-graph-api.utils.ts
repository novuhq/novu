import { safeOutboundJsonRequest } from '@novu/shared/utils/safe-outbound-http';

export const META_GRAPH_API_VERSION = 'v22.0';
export const META_GRAPH_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

export const WHATSAPP_BUSINESS_MANAGEMENT_SCOPE = 'whatsapp_business_management';
export const WHATSAPP_BUSINESS_MESSAGING_SCOPE = 'whatsapp_business_messaging';

export type MetaErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

export interface MetaErrorSummary {
  code?: number;
  subcode?: number;
  message: string;
}

export function extractMetaError(body: unknown): MetaErrorSummary | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const err = (body as MetaErrorBody).error;
  if (!err) return undefined;

  return {
    code: err.code,
    subcode: err.error_subcode,
    message: err.message ?? 'Unknown Meta API error',
  };
}

export type DebugTokenResponse = {
  data?: {
    app_id?: string;
    application?: string;
    type?: string;
    expires_at?: number;
    is_valid?: boolean;
    issued_at?: number;
    scopes?: string[];
    granular_scopes?: Array<{ scope: string; target_ids?: string[] }>;
    user_id?: string;
    error?: {
      code?: number;
      message?: string;
    };
  };
};

export type PhoneNumberDetailsResponse = {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
};

export type WabaPhoneNumbersResponse = {
  data?: Array<{ id?: string; display_phone_number?: string; verified_name?: string }>;
} & MetaErrorBody;

interface MetaCallOptions {
  searchParams?: Record<string, string>;
  timeoutMs?: number;
}

async function metaGraphGet<T>(
  path: string,
  accessToken: string,
  options: MetaCallOptions = {}
): Promise<{
  body: T;
  statusCode: number;
}> {
  const url = new URL(`${META_GRAPH_API_BASE}/${path.replace(/^\//, '')}`);
  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await safeOutboundJsonRequest<T>({
    url,
    method: 'GET',
    timeoutMs: options.timeoutMs ?? 10_000,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return { body: response.body, statusCode: response.statusCode };
}

async function metaGraphPostForm<T>(
  path: string,
  accessToken: string,
  formFields: Record<string, string>,
  options: MetaCallOptions = {}
): Promise<{ body: T; statusCode: number }> {
  const url = new URL(`${META_GRAPH_API_BASE}/${path.replace(/^\//, '')}`);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(formFields)) {
    params.append(key, value);
  }

  const response = await safeOutboundJsonRequest<T>({
    url,
    method: 'POST',
    timeoutMs: options.timeoutMs ?? 10_000,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  return { body: response.body, statusCode: response.statusCode };
}

async function metaGraphPostJson<T>(
  path: string,
  accessToken: string,
  body: object,
  options: MetaCallOptions = {}
): Promise<{ body: T; statusCode: number }> {
  const url = new URL(`${META_GRAPH_API_BASE}/${path.replace(/^\//, '')}`);

  const response = await safeOutboundJsonRequest<T>({
    url,
    method: 'POST',
    timeoutMs: options.timeoutMs ?? 10_000,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body,
  });

  return { body: response.body, statusCode: response.statusCode };
}

export async function debugAccessToken(accessToken: string): Promise<{
  body: DebugTokenResponse;
  statusCode: number;
}> {
  // Per Meta docs, the same user/system token can debug itself.
  return metaGraphGet<DebugTokenResponse>('/debug_token', accessToken, {
    searchParams: { input_token: accessToken },
  });
}

export async function getPhoneNumberDetails(
  accessToken: string,
  phoneNumberId: string
): Promise<{ body: PhoneNumberDetailsResponse | MetaErrorBody; statusCode: number }> {
  return metaGraphGet<PhoneNumberDetailsResponse | MetaErrorBody>(
    `/${encodeURIComponent(phoneNumberId)}`,
    accessToken,
    {
      searchParams: { fields: 'id,display_phone_number,verified_name' },
    }
  );
}

export async function listWabaPhoneNumbers(
  accessToken: string,
  wabaId: string
): Promise<{ body: WabaPhoneNumbersResponse; statusCode: number }> {
  return metaGraphGet<WabaPhoneNumbersResponse>(`/${encodeURIComponent(wabaId)}/phone_numbers`, accessToken, {
    searchParams: { fields: 'id,display_phone_number,verified_name', limit: '50' },
  });
}

export async function subscribeWabaMessagesField(args: {
  accessToken: string;
  wabaId: string;
  callbackUrl: string;
  verifyToken: string;
}): Promise<{ body: { success?: boolean } & MetaErrorBody; statusCode: number }> {
  return metaGraphPostForm<{ success?: boolean } & MetaErrorBody>(
    `/${encodeURIComponent(args.wabaId)}/subscribed_apps`,
    args.accessToken,
    {
      override_callback_uri: args.callbackUrl,
      verify_token: args.verifyToken,
    }
  );
}

/**
 * Subscribes the Meta app to the `whatsapp_business_account` object on the
 * `messages` webhook field. This is an app-level prerequisite — without it
 * Meta refuses any `subscribed_apps` call carrying `override_callback_uri`
 * with `(#100) Before override the current callback uri, your app must be
 * subscribed to receive messages for WhatsApp Business Account`.
 *
 * Uses an **App Access Token** (`{app_id}|{app_secret}`) because per-app
 * subscription configuration is an app-level operation, not a user/system-user
 * one. The user/system access token does not have the right scope.
 */
export async function subscribeAppToWhatsAppEvents(args: {
  appId: string;
  appSecret: string;
  callbackUrl: string;
  verifyToken: string;
}): Promise<{ body: { success?: boolean } & MetaErrorBody; statusCode: number }> {
  const appAccessToken = `${args.appId}|${args.appSecret}`;

  return metaGraphPostForm<{ success?: boolean } & MetaErrorBody>(
    `/${encodeURIComponent(args.appId)}/subscriptions`,
    appAccessToken,
    {
      object: 'whatsapp_business_account',
      fields: 'messages',
      callback_url: args.callbackUrl,
      verify_token: args.verifyToken,
    }
  );
}

export interface SendTemplateArgs {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  templateName: string;
  languageCode: string;
  bodyParameters?: string[];
}

export type SendTemplateResponse = {
  messaging_product?: string;
  contacts?: Array<{ input?: string; wa_id?: string }>;
  messages?: Array<{ id?: string; message_status?: string }>;
} & MetaErrorBody;

export async function sendWhatsAppTemplate(args: SendTemplateArgs): Promise<{
  body: SendTemplateResponse;
  statusCode: number;
}> {
  const template: {
    name: string;
    language: { code: string };
    components?: Array<{
      type: 'body';
      parameters: Array<{ type: 'text'; text: string }>;
    }>;
  } = {
    name: args.templateName,
    language: { code: args.languageCode },
  };

  if (args.bodyParameters?.length) {
    template.components = [
      {
        type: 'body',
        parameters: args.bodyParameters.map((text) => ({ type: 'text', text })),
      },
    ];
  }

  return metaGraphPostJson<SendTemplateResponse>(
    `/${encodeURIComponent(args.phoneNumberId)}/messages`,
    args.accessToken,
    {
      messaging_product: 'whatsapp',
      to: args.to,
      type: 'template',
      template,
    }
  );
}

export type ExchangeCodeForTokenResponse = {
  access_token?: string;
  token_type?: string;
} & MetaErrorBody;

export async function exchangeEmbeddedSignupCodeForToken(args: {
  appId: string;
  appSecret: string;
  code: string;
}): Promise<{ body: ExchangeCodeForTokenResponse; statusCode: number }> {
  const url = new URL(`${META_GRAPH_API_BASE}/oauth/access_token`);
  url.searchParams.set('client_id', args.appId);
  url.searchParams.set('client_secret', args.appSecret);
  url.searchParams.set('code', args.code);

  const response = await safeOutboundJsonRequest<ExchangeCodeForTokenResponse>({
    url,
    method: 'GET',
    timeoutMs: 10_000,
  });

  return { body: response.body, statusCode: response.statusCode };
}

export type RegisterPhoneNumberResponse = {
  success?: boolean;
} & MetaErrorBody;

export async function registerWhatsAppPhoneNumber(args: {
  accessToken: string;
  phoneNumberId: string;
  pin: string;
}): Promise<{ body: RegisterPhoneNumberResponse; statusCode: number }> {
  return metaGraphPostJson<RegisterPhoneNumberResponse>(
    `/${encodeURIComponent(args.phoneNumberId)}/register`,
    args.accessToken,
    {
      messaging_product: 'whatsapp',
      pin: args.pin,
    }
  );
}

export function generateWhatsAppRegistrationPin(): string {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

export function flattenScopes(debug: DebugTokenResponse): string[] {
  const flat = new Set<string>();
  for (const scope of debug.data?.scopes ?? []) {
    flat.add(scope);
  }
  for (const granular of debug.data?.granular_scopes ?? []) {
    if (granular.scope) flat.add(granular.scope);
  }

  return Array.from(flat);
}

/** Meta's review states for a message template. */
export type MessageTemplateStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED' | 'IN_APPEAL';

export type MessageTemplate = {
  id?: string;
  name?: string;
  status?: MessageTemplateStatus | string;
  category?: string;
  rejected_reason?: string;
  components?: Array<{ type?: string; text?: string }>;
};

/** The body text Meta holds for a template. */
export function templateBodyOf(template: MessageTemplate): string | undefined {
  return template.components?.find((component) => component.type?.toUpperCase() === 'BODY')?.text;
}

export type CreateMessageTemplateResponse = { id?: string; status?: string; category?: string } & MetaErrorBody;

export type ListMessageTemplatesResponse = { data?: MessageTemplate[] } & MetaErrorBody;

/** A template's body variable and the button that comes back to us, in the shape Meta wants for a named body. */
export interface MessageTemplateDefinition {
  name: string;
  language: string;
  /** Uses named variables, such as `{{agent_name}}`. */
  body: string;
  /** An example value for each named variable, which Meta's review needs. */
  examples: Record<string, string>;
  /** Quick-reply buttons, in order. */
  quickReplies?: string[];
}

/**
 * Submits a UTILITY template for review on a WhatsApp Business account. Meta answers with its id and the first
 * status (usually PENDING); review can take up to 24 hours.
 */
export async function createMessageTemplate(args: {
  accessToken: string;
  wabaId: string;
  template: MessageTemplateDefinition;
  timeoutMs?: number;
}): Promise<{ body: CreateMessageTemplateResponse; statusCode: number }> {
  const { template } = args;
  const examples = Object.entries(template.examples).map(([param_name, example]) => ({ param_name, example }));
  // A body without variables takes no example: Meta refuses one it has nothing to match against.
  const components: object[] = [
    {
      type: 'BODY',
      text: template.body,
      ...(examples.length ? { example: { body_text_named_params: examples } } : {}),
    },
  ];
  if (template.quickReplies?.length) {
    components.push({
      type: 'BUTTONS',
      buttons: template.quickReplies.map((text) => ({ type: 'QUICK_REPLY', text })),
    });
  }

  return metaGraphPostJson<CreateMessageTemplateResponse>(
    `/${encodeURIComponent(args.wabaId)}/message_templates`,
    args.accessToken,
    {
      name: template.name,
      language: template.language,
      category: 'UTILITY',
      parameter_format: 'NAMED',
      components,
    },
    { timeoutMs: args.timeoutMs }
  );
}

/** One template by name on a WhatsApp Business account, or `undefined` when there is none. */
export async function findMessageTemplate(args: {
  accessToken: string;
  wabaId: string;
  name: string;
  timeoutMs?: number;
}): Promise<{ template?: MessageTemplate; error?: MetaErrorSummary; statusCode: number }> {
  const { body, statusCode } = await metaGraphGet<ListMessageTemplatesResponse>(
    `/${encodeURIComponent(args.wabaId)}/message_templates`,
    args.accessToken,
    {
      searchParams: { name: args.name, fields: 'id,name,status,category,rejected_reason,components' },
      timeoutMs: args.timeoutMs,
    }
  );
  const error = extractMetaError(body);
  if (error || statusCode >= 400) {
    return { error: error ?? { message: `Meta answered ${statusCode}` }, statusCode };
  }

  // Meta matches `name` as a prefix, so pick the exact one.
  return { template: body.data?.find((candidate) => candidate.name === args.name), statusCode };
}

/**
 * Sends an approved template with named body parameters and a payload on each quick-reply button, so a tap comes
 * back as that payload.
 */
export async function sendNamedWhatsAppTemplate(args: {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  templateName: string;
  languageCode: string;
  bodyParameters: Record<string, string>;
  quickReplyPayloads?: string[];
  timeoutMs?: number;
}): Promise<{ body: SendTemplateResponse; statusCode: number }> {
  const parameters = Object.entries(args.bodyParameters).map(([parameter_name, text]) => ({
    type: 'text',
    parameter_name,
    text,
  }));
  // A template without variables takes no body component: Meta refuses parameters it doesn't expect.
  const components: object[] = [
    ...(parameters.length ? [{ type: 'body', parameters }] : []),
    ...(args.quickReplyPayloads ?? []).map((payload, index) => ({
      type: 'button',
      sub_type: 'quick_reply',
      index: String(index),
      parameters: [{ type: 'payload', payload }],
    })),
  ];

  return metaGraphPostJson<SendTemplateResponse>(
    `/${encodeURIComponent(args.phoneNumberId)}/messages`,
    args.accessToken,
    {
      messaging_product: 'whatsapp',
      to: args.to,
      type: 'template',
      template: { name: args.templateName, language: { code: args.languageCode }, components },
    },
    { timeoutMs: args.timeoutMs }
  );
}
