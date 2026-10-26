/**
 * Provision the one shared ElevenLabs voice shell.
 *
 * Novu never sends TwiML and never stores the Twilio auth token. ElevenLabs
 * imports the number and dials. The number, the ElevenLabs workspace residency,
 * and NOVU_VOICE_ELEVENLABS_API_BASE must be the same region. The default host
 * is https://api.elevenlabs.io (global). US residency is
 * https://api.us.elevenlabs.io. EU residency is
 * https://api.eu.residency.elevenlabs.io.
 *
 * Required:
 *   NOVU_VOICE_ELEVENLABS_API_KEY or ELEVENLABS_API_KEY
 *   NOVU_VOICE_PUBLIC_API_URL          public origin of this API, no path
 *
 * Phone import, skipped when any of these are missing:
 *   NOVU_VOICE_TWILIO_NUMBER           E.164 of the shared number
 *   TWILIO_ACCOUNT_SID                 printed back; not a Novu runtime secret
 *   TWILIO_AUTH_TOKEN                  script input only
 *
 * Failure webhook, skipped when the URL is missing:
 *   NOVU_VOICE_WEBHOOK_URL             https://<api>/v1/human/voice/calls/failure
 *
 * Live proof of two opening lines, skipped unless two destinations are set:
 *   NOVU_VOICE_PROVE_TO                two E.164 numbers, comma-separated
 *
 * Copy the printed ids into NOVU_VOICE_TWILIO_NUMBER,
 * NOVU_VOICE_ELEVENLABS_PHONE_NUMBER_ID, NOVU_VOICE_ELEVENLABS_AGENT_ID, and
 * NOVU_VOICE_ELEVENLABS_API_KEY. Copy the webhook secret into
 * NOVU_VOICE_ELEVENLABS_WEBHOOK_SECRET.
 *
 * ElevenLabs posts `{custom_llm.url}/chat/completions`. The bridge from
 * NV-9171 is that request. The url stored here is `{public}/v1/human/voice`.
 */
import { resolve } from 'node:path';
import { config } from 'dotenv';

config({ path: resolve(process.cwd(), 'src/.env') });

const PREMADE_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();

  return value ? value : undefined;
}

function requireEnv(name: string): string {
  const value = env(name);
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function apiBase(): string {
  return (env('NOVU_VOICE_ELEVENLABS_API_BASE') ?? 'https://api.elevenlabs.io').replace(/\/$/, '');
}

function apiKey(): string {
  return env('NOVU_VOICE_ELEVENLABS_API_KEY') ?? requireEnv('ELEVENLABS_API_KEY');
}

async function elFetch<T = Record<string, never>>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('xi-api-key', apiKey());
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${apiBase()}/v1${path}`, { ...init, headers });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} → ${response.status}: ${text}`);
  }

  if (!text) {
    throw new Error(`${init.method ?? 'GET'} ${path} returned an empty body`);
  }

  return JSON.parse(text) as T;
}

function shellPayload(publicApiUrl: string) {
  const bridge = `${publicApiUrl.replace(/\/$/, '')}/v1/human/voice`;

  return {
    name: 'Novu voice shell',
    tags: ['novu-voice'],
    conversation_config: {
      agent: {
        first_message: '{{opening_line}}',
        language: 'en',
        dynamic_variables: {
          dynamic_variable_placeholders: {
            opening_line: 'Hello.',
          },
        },
        prompt: {
          prompt:
            'You are a voice shell. Speak only the next line you are given. Do not invent speech and do not add a greeting of your own.',
          llm: 'custom-llm',
          custom_llm: {
            url: bridge,
            model_id: 'novu-voice-bridge',
            api_type: 'chat_completions',
          },
          max_tokens: 200,
          tools: [],
        },
      },
      asr: {
        quality: 'high',
        provider: 'scribe_realtime',
        user_input_audio_format: 'pcm_16000',
      },
      tts: {
        model_id: 'eleven_flash_v2',
        voice_id: PREMADE_VOICE_ID,
      },
      turn: {
        turn_timeout: 7,
        mode: 'turn',
      },
      conversation: {
        max_duration_seconds: 300,
      },
    },
    platform_settings: {
      overrides: {
        conversation_config_override: {
          agent: {
            first_message: true,
            language: false,
            prompt: { prompt: false },
          },
        },
        custom_llm_extra_body: true,
      },
      privacy: {
        record_voice: true,
        retention_days: 30,
      },
    },
  };
}

interface AgentRecord {
  agent_id?: string;
  platform_settings?: {
    overrides?: {
      conversation_config_override?: {
        agent?: {
          first_message?: boolean;
          prompt?: { prompt?: boolean };
        };
      };
      custom_llm_extra_body?: boolean;
    };
  };
}

function assertAllowlist(agent: AgentRecord): void {
  const overrides = agent.platform_settings?.overrides;
  const agentOverrides = overrides?.conversation_config_override?.agent;
  const raw = JSON.stringify(overrides);

  if (agentOverrides?.first_message !== true) {
    throw new Error(`first_message override is not allowed. Stored overrides: ${raw}`);
  }

  if (agentOverrides.prompt?.prompt === true) {
    throw new Error(
      `prompt override is allowed, so two calls could rewrite the shell. If every flag reads true, GET is filling defaults and the runtime allowlist is off. Stored overrides: ${raw}`
    );
  }

  if (overrides?.custom_llm_extra_body !== true) {
    throw new Error(`custom_llm_extra_body is not allowed. Stored overrides: ${raw}`);
  }

  console.log(
    `Allowlist stored: first_message=true prompt=${String(agentOverrides.prompt?.prompt)} custom_llm_extra_body=true`
  );
}

async function upsertAgent(publicApiUrl: string): Promise<string> {
  const payload = shellPayload(publicApiUrl);
  const existing = env('NOVU_VOICE_ELEVENLABS_AGENT_ID');

  if (existing) {
    console.log(`Updating agent ${existing}`);
    await elFetch(`/convai/agents/${existing}`, { method: 'PATCH', body: JSON.stringify(payload) });

    return existing;
  }

  console.log('Creating voice shell');
  const created = await elFetch<AgentRecord>('/convai/agents/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const agentId = created.agent_id;
  if (!agentId) {
    throw new Error(`Create succeeded but no agent_id: ${JSON.stringify(created)}`);
  }

  return agentId;
}

interface PhoneNumberRecord {
  phone_number_id?: string;
  phone_number?: string;
}

async function listPhoneNumbers(): Promise<PhoneNumberRecord[]> {
  const listed = await elFetch<PhoneNumberRecord[] | { phone_numbers?: PhoneNumberRecord[] }>('/convai/phone-numbers');

  if (Array.isArray(listed)) {
    return listed;
  }

  return listed.phone_numbers ?? [];
}

async function importPhoneNumber(agentId: string): Promise<string | undefined> {
  const phoneNumber = env('NOVU_VOICE_TWILIO_NUMBER');
  const sid = env('TWILIO_ACCOUNT_SID');
  const token = env('TWILIO_AUTH_TOKEN');
  if (!phoneNumber || !sid || !token) {
    console.log('Skipping phone import. Set NOVU_VOICE_TWILIO_NUMBER, TWILIO_ACCOUNT_SID, and TWILIO_AUTH_TOKEN.');

    return env('NOVU_VOICE_ELEVENLABS_PHONE_NUMBER_ID');
  }

  const existing = (await listPhoneNumbers()).find((item) => item.phone_number === phoneNumber);
  if (existing?.phone_number_id) {
    console.log(`Twilio number already imported: ${existing.phone_number_id}`);

    return existing.phone_number_id;
  }

  const created = await elFetch<PhoneNumberRecord>('/convai/phone-numbers', {
    method: 'POST',
    body: JSON.stringify({
      provider: 'twilio',
      label: 'Novu shared voice',
      phone_number: phoneNumber,
      sid,
      token,
      enable_sms: false,
      agent_id: agentId,
    }),
  });

  return created.phone_number_id;
}

async function assignPhoneNumber(agentId: string, phoneNumberId: string): Promise<void> {
  await elFetch(`/convai/phone-numbers/${phoneNumberId}`, {
    method: 'PATCH',
    body: JSON.stringify({ agent_id: agentId }),
  });
  console.log(`Assigned ${phoneNumberId} to agent ${agentId}`);
}

async function registerWebhook(): Promise<void> {
  const webhookUrl = env('NOVU_VOICE_WEBHOOK_URL');
  if (!webhookUrl) {
    console.log('Skipping webhook registration. Set NOVU_VOICE_WEBHOOK_URL to the public failure URL.');

    return;
  }

  const created = await elFetch<{ webhook_id?: string; webhook_secret?: string }>('/workspace/webhooks', {
    method: 'POST',
    body: JSON.stringify({
      settings: {
        auth_type: 'hmac',
        name: 'Novu voice call failures',
        webhook_url: webhookUrl,
      },
    }),
  });

  if (!created.webhook_id) {
    throw new Error(`Webhook create returned no id: ${JSON.stringify(created)}`);
  }

  await elFetch('/convai/settings', {
    method: 'PATCH',
    body: JSON.stringify({
      webhooks: {
        post_call_webhook_id: created.webhook_id,
        events: ['call_initiation_failure'],
      },
    }),
  });

  console.log(`Webhook ${created.webhook_id}`);
  console.log(`NOVU_VOICE_ELEVENLABS_WEBHOOK_SECRET=${created.webhook_secret ?? ''}`);
}

async function proveOpeningLines(agentId: string, phoneNumberId: string | undefined): Promise<void> {
  const destinations = (env('NOVU_VOICE_PROVE_TO') ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (destinations.length < 2) {
    console.log('Skipping the live opening-line proof. Set NOVU_VOICE_PROVE_TO to two comma-separated E.164 numbers.');

    return;
  }

  if (!phoneNumberId) {
    throw new Error('Cannot prove opening lines without an ElevenLabs phone-number id.');
  }

  const lines = ['Opening line alpha.', 'Opening line beta.'];
  const placed = await Promise.all(
    destinations.slice(0, 2).map((toNumber, index) =>
      elFetch('/convai/twilio/outbound-call', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: agentId,
          agent_phone_number_id: phoneNumberId,
          to_number: toNumber,
          conversation_initiation_client_data: {
            dynamic_variables: { opening_line: lines[index] },
            custom_llm_extra_body: {
              interactionId: `prove_${index}`,
              environmentId: 'prove',
              subscriberId: `prove_${index}`,
            },
          },
        }),
      })
    )
  );

  console.log('Placed two calls without patching the shell:');
  console.log(JSON.stringify(placed, null, 2));
}

async function main(): Promise<void> {
  const publicApiUrl = requireEnv('NOVU_VOICE_PUBLIC_API_URL');
  const agentId = await upsertAgent(publicApiUrl);
  const stored = await elFetch<AgentRecord>(`/convai/agents/${agentId}`);
  assertAllowlist(stored);

  const phoneNumberId = await importPhoneNumber(agentId);
  if (phoneNumberId) {
    await assignPhoneNumber(agentId, phoneNumberId);
  }
  await registerWebhook();
  await proveOpeningLines(agentId, phoneNumberId);

  console.log('--- copy into the deployment env ---');
  console.log(`region=${apiBase()}`);
  console.log(`twilio_account_sid=${env('TWILIO_ACCOUNT_SID') ?? ''}`);
  console.log(`NOVU_VOICE_TWILIO_NUMBER=${env('NOVU_VOICE_TWILIO_NUMBER') ?? ''}`);
  console.log(`NOVU_VOICE_ELEVENLABS_PHONE_NUMBER_ID=${phoneNumberId ?? ''}`);
  console.log(`NOVU_VOICE_ELEVENLABS_AGENT_ID=${agentId}`);
  console.log(`voice=${PREMADE_VOICE_ID} (premade Rachel)`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
