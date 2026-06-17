import { safeOutboundJsonRequest } from '@novu/application-generic';

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
  const bodyParameters = args.bodyParameters?.filter((value) => value.trim().length > 0) ?? [];
  const template: Record<string, unknown> = {
    name: args.templateName,
    language: { code: args.languageCode },
  };

  if (bodyParameters.length > 0) {
    template.components = [
      {
        type: 'body',
        parameters: bodyParameters.map((text) => ({ type: 'text', text })),
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

/**
 * Name of the UTILITY template Novu provisions on a customer's WABA during
 * Embedded Signup so we can verify outbound delivery without asking the
 * customer to create or approve anything in WhatsApp Manager. A no-variable
 * utility body keeps Meta's automated review fast (typically 1–2 minutes).
 */
export const NOVU_CONNECTION_TEST_TEMPLATE_NAME = 'novu_connection_test';
export const NOVU_CONNECTION_TEST_TEMPLATE_LANGUAGE = 'en_US';
const NOVU_CONNECTION_TEST_TEMPLATE_BODY =
  'This is a connection test from Novu confirming your WhatsApp Business number is set up correctly and can deliver notifications.';

export type WhatsAppTemplateComponent = {
  type?: string;
  text?: string;
  format?: string;
};

export type WhatsAppMessageTemplate = {
  id?: string;
  name?: string;
  status?: string;
  language?: string;
  category?: string;
  components?: WhatsAppTemplateComponent[];
};

export type ListMessageTemplatesResponse = {
  data?: WhatsAppMessageTemplate[];
  paging?: unknown;
} & MetaErrorBody;

export async function listWhatsAppMessageTemplates(args: {
  accessToken: string;
  wabaId: string;
}): Promise<{ body: ListMessageTemplatesResponse; statusCode: number }> {
  return metaGraphGet<ListMessageTemplatesResponse>(
    `/${encodeURIComponent(args.wabaId)}/message_templates`,
    args.accessToken,
    { searchParams: { fields: 'name,status,language,category,components', limit: '200' } }
  );
}

export type CreateMessageTemplateResponse = {
  id?: string;
  status?: string;
  category?: string;
} & MetaErrorBody;

export async function createWhatsAppConnectionTestTemplate(args: {
  accessToken: string;
  wabaId: string;
}): Promise<{ body: CreateMessageTemplateResponse; statusCode: number }> {
  return metaGraphPostJson<CreateMessageTemplateResponse>(
    `/${encodeURIComponent(args.wabaId)}/message_templates`,
    args.accessToken,
    {
      name: NOVU_CONNECTION_TEST_TEMPLATE_NAME,
      category: 'UTILITY',
      language: NOVU_CONNECTION_TEST_TEMPLATE_LANGUAGE,
      components: [{ type: 'BODY', text: NOVU_CONNECTION_TEST_TEMPLATE_BODY }],
    }
  );
}

/**
 * Counts the distinct positional/named body variables in a template so callers
 * can pick a template they can actually fill. A zero-variable template can be
 * sent without any per-recipient data, which is what we want for a test send.
 */
export function countTemplateRequiredBodyParameters(template: WhatsAppMessageTemplate): number {
  const body = template.components?.find((component) => component.type?.toUpperCase() === 'BODY');

  if (!body?.text) {
    return 0;
  }

  const matches = body.text.match(/\{\{\s*[\w]+\s*\}\}/g);

  if (!matches) {
    return 0;
  }

  return new Set(matches.map((match) => match.replace(/\s/g, ''))).size;
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
