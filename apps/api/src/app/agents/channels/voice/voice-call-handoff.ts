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
  /**
   * How many inbound utterances have already been handed to the calling agent.
   * Advanced atomically by `takeUtterances` so overlapping turns cannot both claim
   * the same words.
   */
  agentSeq: number;
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
  agentSeq?: number;
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
    agentSeq: 0,
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
    agentSeq: handoff.agentSeq,
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
    agentSeq: typeof stored.agentSeq === 'number' && stored.agentSeq >= 0 ? stored.agentSeq : 0,
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

export type RecordedInboundUtterances = {
  handoff: VoiceCallHandoff;
  /** Lines this call appended. Empty when a concurrent request already stored them. */
  appended: string[];
};

/**
 * Appends person lines past the stored count and marks the call live.
 * `userTexts` is the full history, not a pre-sliced tail — the count check and
 * the append run in one Redis script so two overlapping requests cannot both write.
 * Null when the call is already over or unknown.
 */
export async function recordInboundUtterances(
  cache: CacheService,
  conversationId: string,
  userTexts: string[]
): Promise<RecordedInboundUtterances | null> {
  const raw = await cache.eval<unknown>(
    RECORD_INBOUND_SCRIPT,
    [voiceCallRegistryKey(conversationId)],
    [String(VOICE_CALL_REGISTRY_TTL_SECONDS), new Date().toISOString(), JSON.stringify(userTexts)]
  );
  if (typeof raw !== 'string') {
    return null;
  }

  let parsed: { handoffJson?: unknown; appendedJson?: unknown };
  try {
    parsed = JSON.parse(raw) as { handoffJson?: unknown; appendedJson?: unknown };
  } catch {
    return null;
  }

  if (typeof parsed.handoffJson !== 'string') {
    return null;
  }

  const handoff = parseVoiceCallHandoff(parsed.handoffJson);
  if (!handoff) {
    return null;
  }

  return {
    handoff,
    appended: typeof parsed.appendedJson === 'string' ? utterancesOf(parsed.appendedJson) : [],
  };
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

export type TakenUtterances = {
  handoff: VoiceCallHandoff;
  /** Lines this take handed to the agent. Empty when nothing new has arrived. */
  utterances: string[];
};

/**
 * Hands every utterance past `agentSeq` to the calling agent and advances the
 * cursor in one Redis script, so two overlapping turns cannot both claim the
 * same words. Null when the call is unknown or already ended.
 */
export async function takeUtterances(cache: CacheService, conversationId: string): Promise<TakenUtterances | null> {
  const raw = await cache.eval<unknown>(
    TAKE_UTTERANCES_SCRIPT,
    [voiceCallRegistryKey(conversationId)],
    [String(VOICE_CALL_REGISTRY_TTL_SECONDS)]
  );
  if (typeof raw !== 'string') {
    return null;
  }

  let parsed: { handoffJson?: unknown; takenJson?: unknown };
  try {
    parsed = JSON.parse(raw) as { handoffJson?: unknown; takenJson?: unknown };
  } catch {
    return null;
  }

  if (typeof parsed.handoffJson !== 'string') {
    return null;
  }

  const handoff = parseVoiceCallHandoff(parsed.handoffJson);
  if (!handoff) {
    return null;
  }

  return {
    handoff,
    utterances: typeof parsed.takenJson === 'string' ? utterancesOf(parsed.takenJson) : [],
  };
}

/**
 * An open park is still a live call. Keepalives bump this so a long
 * `NOVU_VOICE_BRIDGE_PARK_MS` is not treated as a dropped webhook.
 */
export async function noteVoiceBridgeAlive(cache: CacheService, conversationId: string): Promise<void> {
  await cache.eval<unknown>(
    TOUCH_BRIDGE_SCRIPT,
    [voiceCallRegistryKey(conversationId)],
    [String(VOICE_CALL_REGISTRY_TTL_SECONDS), new Date().toISOString()]
  );
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
local incoming = cjson.decode(ARGV[3])
if type(incoming) ~= 'table' then
  incoming = {}
end
local list = {}
if type(data.utterancesJson) == 'string' and data.utterancesJson ~= '' then
  local decodedOk, decoded = pcall(cjson.decode, data.utterancesJson)
  if decodedOk and type(decoded) == 'table' then
    list = decoded
  end
end
local stored = tonumber(data.inboundSeq) or 0
local index = 0
local appended = {}
for _, text in ipairs(incoming) do
  if type(text) == 'string' and text ~= '' then
    index = index + 1
    if index > stored then
      table.insert(list, text)
      table.insert(appended, text)
    end
  end
end
if #appended > 0 then
  data.utterancesJson = cjson.encode(list)
  data.inboundSeq = stored + #appended
elseif type(data.utterancesJson) ~= 'string' then
  data.utterancesJson = '[]'
end
data.lastBridgeRequestAt = ARGV[2]
${SAVE_HANDOFF}
return cjson.encode({ handoffJson = cjson.encode(data), appendedJson = cjson.encode(appended) })
`;

const TOUCH_BRIDGE_SCRIPT = `
${LOAD_HANDOFF}
if data.status ~= 'live' then
  return 0
end
data.lastBridgeRequestAt = ARGV[2]
${SAVE_HANDOFF}
return 1
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

const TAKE_UTTERANCES_SCRIPT = `
${LOAD_HANDOFF}
if data.status == 'ended' then
  return nil
end
local list = {}
if type(data.utterancesJson) == 'string' and data.utterancesJson ~= '' then
  local decodedOk, decoded = pcall(cjson.decode, data.utterancesJson)
  if decodedOk and type(decoded) == 'table' then
    list = decoded
  end
end
local agentSeq = tonumber(data.agentSeq) or 0
local inboundSeq = tonumber(data.inboundSeq) or 0
local taken = {}
for i = agentSeq + 1, #list do
  local text = list[i]
  if type(text) == 'string' and text ~= '' then
    table.insert(taken, text)
  end
end
if inboundSeq > agentSeq then
  data.agentSeq = inboundSeq
elseif type(data.agentSeq) ~= 'number' then
  data.agentSeq = agentSeq
end
${SAVE_HANDOFF}
return cjson.encode({ handoffJson = cjson.encode(data), takenJson = cjson.encode(taken) })
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
