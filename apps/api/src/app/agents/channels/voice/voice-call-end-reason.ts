import { VoiceCallEndReasonEnum } from '@novu/shared';

/**
 * ElevenLabs `termination_reason` is free text. First match wins.
 * Anything else is `other` — the webhook still closes the call.
 */
const TERMINATION_RULES: Array<{
  matches: (reason: string) => boolean;
  reason: VoiceCallEndReasonEnum;
}> = [
  {
    matches: (reason) => reason.includes('max') && reason.includes('duration'),
    reason: VoiceCallEndReasonEnum.MAX_DURATION,
  },
  {
    matches: (reason) => reason.includes('end_call') || reason.includes('agent'),
    reason: VoiceCallEndReasonEnum.AGENT_HANGUP,
  },
  {
    matches: (reason) => reason.includes('user') || reason.includes('customer') || reason.includes('remote'),
    reason: VoiceCallEndReasonEnum.PERSON_HANGUP,
  },
];

export function endReasonFromTermination(terminationReason: string | undefined): VoiceCallEndReasonEnum {
  const reason = terminationReason?.toLowerCase() ?? '';
  for (const rule of TERMINATION_RULES) {
    if (reason && rule.matches(reason)) {
      return rule.reason;
    }
  }

  return VoiceCallEndReasonEnum.OTHER;
}
