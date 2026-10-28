import type { CacheService } from '@novu/application-generic';

/** ElevenLabs retries the failure webhook for about 40 minutes. Two hours covers that. */
export const VOICE_CALL_REGISTRY_TTL_SECONDS = 2 * 60 * 60;

export type VoiceCallHandoffStatus = 'dialing' | 'live' | 'ended';

/**
 * Hot state for one outbound call, keyed by the ElevenLabs conversation id.
 * Written when the dial is accepted. The bridge promotes it to `live`.
 * Transcript rows stay on the conversation. Why the call ended stays on the delivery.
 */
export interface VoiceCallHandoff {
  environmentId: string;
  organizationId: string;
  interactionId: string;
  subscriberId: string;
  status: VoiceCallHandoffStatus;
  inboundSeq: number;
  utterances: string[];
  pendingAgentLine?: string;
  hangupRequested?: boolean;
  lastBridgeRequestAt?: string;
}

interface StoredVoiceCallHandoff {
  environmentId?: string;
  organizationId?: string;
  interactionId?: string;
  subscriberId?: string;
  status?: string;
  inboundSeq?: number;
  /** JSON array. A string so Redis cjson does not turn an empty list into an object. */
  utterancesJson?: string;
  pendingAgentLine?: string;
  hangupRequested?: boolean;
  lastBridgeRequestAt?: string;
}

export interface DialingVoiceCall {
  environmentId: string;
  organizationId: string;
  interactionId: string;
  subscriberId: string;
}

/**
 * Redis lookup for webhooks, which only carry a conversation id.
 * The hash tag keeps the key on one cluster slot so the handoff scripts can run.
 */
export function voiceCallRegistryKey(conversationId: string): string {
  return `voice-call:{${conversationId}}`;
}

export function createDialingHandoff(input: DialingVoiceCall): VoiceCallHandoff {
  return {
    environmentId: input.environmentId,
    organizationId: input.organizationId,
    interactionId: input.interactionId,
    subscriberId: input.subscriberId,
    status: 'dialing',
    inboundSeq: 0,
    utterances: [],
  };
}

export function serializeVoiceCallHandoff(handoff: VoiceCallHandoff): string {
  const stored: StoredVoiceCallHandoff = {
    environmentId: handoff.environmentId,
    organizationId: handoff.organizationId,
    interactionId: handoff.interactionId,
    subscriberId: handoff.subscriberId,
    status: handoff.status,
    inboundSeq: handoff.inboundSeq,
    utterancesJson: JSON.stringify(handoff.utterances),
    ...(handoff.pendingAgentLine ? { pendingAgentLine: handoff.pendingAgentLine } : {}),
    ...(handoff.hangupRequested ? { hangupRequested: true } : {}),
    ...(handoff.lastBridgeRequestAt ? { lastBridgeRequestAt: handoff.lastBridgeRequestAt } : {}),
  };

  return JSON.stringify(stored);
}

export function parseVoiceCallHandoff(raw: string): VoiceCallHandoff | null {
  let stored: StoredVoiceCallHandoff;
  try {
    stored = JSON.parse(raw) as StoredVoiceCallHandoff;
  } catch {
    return null;
  }

  if (!stored.environmentId || !stored.organizationId) {
    return null;
  }

  return {
    environmentId: stored.environmentId,
    organizationId: stored.organizationId,
    interactionId: stored.interactionId ?? '',
    subscriberId: stored.subscriberId ?? '',
    status: statusOf(stored.status),
    inboundSeq: typeof stored.inboundSeq === 'number' && stored.inboundSeq >= 0 ? stored.inboundSeq : 0,
    utterances: utterancesOf(stored.utterancesJson),
    ...(stored.pendingAgentLine ? { pendingAgentLine: stored.pendingAgentLine } : {}),
    ...(stored.hangupRequested ? { hangupRequested: true } : {}),
    ...(stored.lastBridgeRequestAt ? { lastBridgeRequestAt: stored.lastBridgeRequestAt } : {}),
  };
}

export async function readVoiceCallHandoff(
  cache: CacheService,
  conversationId: string
): Promise<VoiceCallHandoff | null> {
  const raw = await cache.get(voiceCallRegistryKey(conversationId));
  if (!raw) {
    return null;
  }

  return parseVoiceCallHandoff(raw);
}

/** Appends new person lines and marks the call live. Null when the call is already over or unknown. */
export async function recordInboundUtterances(
  cache: CacheService,
  conversationId: string,
  utterances: string[]
): Promise<VoiceCallHandoff | null> {
  const raw = await cache.eval<unknown>(
    RECORD_INBOUND_SCRIPT,
    [voiceCallRegistryKey(conversationId)],
    [String(VOICE_CALL_REGISTRY_TTL_SECONDS), new Date().toISOString(), JSON.stringify(utterances)]
  );

  return typeof raw === 'string' ? parseVoiceCallHandoff(raw) : null;
}

/** One bridge request takes the pending line. A second request sees it already gone. */
export async function claimAgentLine(
  cache: CacheService,
  conversationId: string
): Promise<{ line: string; hangupRequested: boolean } | null> {
  const raw = await cache.eval<unknown>(
    CLAIM_LINE_SCRIPT,
    [voiceCallRegistryKey(conversationId)],
    [String(VOICE_CALL_REGISTRY_TTL_SECONDS)]
  );
  if (typeof raw !== 'string') {
    return null;
  }

  let parsed: { line?: string; hangupRequested?: boolean };
  try {
    parsed = JSON.parse(raw) as { line?: string; hangupRequested?: boolean };
  } catch {
    return null;
  }

  const line = parsed.line?.trim();
  if (!line) {
    return null;
  }

  return { line, hangupRequested: Boolean(parsed.hangupRequested) };
}

/** False when the call is not live, so a line cannot sit in Redis after hangup. */
export async function postAgentLine(
  cache: CacheService,
  conversationId: string,
  line: string,
  hangupRequested: boolean
): Promise<boolean> {
  const result = await cache.eval<unknown>(
    POST_LINE_SCRIPT,
    [voiceCallRegistryKey(conversationId)],
    [String(VOICE_CALL_REGISTRY_TTL_SECONDS), line, hangupRequested ? '1' : '0']
  );

  return Number(result) === 1;
}

export async function endVoiceCallHandoff(cache: CacheService, conversationId: string): Promise<void> {
  await cache.eval<unknown>(
    END_CALL_SCRIPT,
    [voiceCallRegistryKey(conversationId)],
    [String(VOICE_CALL_REGISTRY_TTL_SECONDS)]
  );
}

const LOAD_HANDOFF = `
local raw = redis.call('GET', KEYS[1])
if not raw then
  return nil
end
local ok, data = pcall(cjson.decode, raw)
if not ok or type(data) ~= 'table' then
  return nil
end
`;

const SAVE_HANDOFF = `
redis.call('SET', KEYS[1], cjson.encode(data), 'EX', ARGV[1])
`;

const RECORD_INBOUND_SCRIPT = `
${LOAD_HANDOFF}
if data.status == 'ended' then
  return nil
end
if data.status ~= 'live' then
  data.status = 'live'
end
local added = cjson.decode(ARGV[3])
if type(added) ~= 'table' then
  added = {}
end
local list = {}
if type(data.utterancesJson) == 'string' and data.utterancesJson ~= '' then
  local decodedOk, decoded = pcall(cjson.decode, data.utterancesJson)
  if decodedOk and type(decoded) == 'table' then
    list = decoded
  end
end
local count = 0
for _, text in ipairs(added) do
  if type(text) == 'string' and text ~= '' then
    table.insert(list, text)
    count = count + 1
  end
end
if count > 0 then
  data.utterancesJson = cjson.encode(list)
  data.inboundSeq = (tonumber(data.inboundSeq) or 0) + count
elseif type(data.utterancesJson) ~= 'string' then
  data.utterancesJson = '[]'
end
data.lastBridgeRequestAt = ARGV[2]
${SAVE_HANDOFF}
return cjson.encode(data)
`;

const CLAIM_LINE_SCRIPT = `
${LOAD_HANDOFF}
if data.status ~= 'live' then
  return nil
end
local line = data.pendingAgentLine
if type(line) ~= 'string' or line == '' then
  return nil
end
local hangup = data.hangupRequested == true
data.pendingAgentLine = nil
data.hangupRequested = nil
${SAVE_HANDOFF}
return cjson.encode({ line = line, hangupRequested = hangup })
`;

const POST_LINE_SCRIPT = `
${LOAD_HANDOFF}
if data.status ~= 'live' then
  return 0
end
data.pendingAgentLine = ARGV[2]
if ARGV[3] == '1' then
  data.hangupRequested = true
else
  data.hangupRequested = nil
end
${SAVE_HANDOFF}
return 1
`;

const END_CALL_SCRIPT = `
${LOAD_HANDOFF}
data.status = 'ended'
data.pendingAgentLine = nil
data.hangupRequested = nil
${SAVE_HANDOFF}
return 1
`;

function statusOf(value: string | undefined): VoiceCallHandoffStatus {
  if (value === 'live' || value === 'ended' || value === 'dialing') {
    return value;
  }

  return 'dialing';
}

function utterancesOf(encoded: string | undefined): string[] {
  if (!encoded) {
    return [];
  }

  try {
    const parsed = JSON.parse(encoded) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    return [];
  }
}
