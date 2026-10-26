import { VoiceCallFailure, VoiceCallFailureCodeEnum } from '@novu/shared';

const MESSAGES: Record<VoiceCallFailureCodeEnum, string> = {
  [VoiceCallFailureCodeEnum.BUSY]: 'The line was busy.',
  [VoiceCallFailureCodeEnum.NO_ANSWER]: 'Nobody answered.',
  [VoiceCallFailureCodeEnum.REJECTED]: 'The call was declined.',
  [VoiceCallFailureCodeEnum.INVALID_NUMBER]: 'That phone number is not valid.',
  [VoiceCallFailureCodeEnum.CARRIER_FAILURE]: 'The carrier could not connect the call.',
};

/** Twilio error codes that mean the destination number itself is unusable. */
const INVALID_NUMBER_CODES = new Set(['21211', '21214', '13223', '13224', '21217']);

/** SIP codes for a callee who rejected the call. */
const REJECTED_SIP_CODES = new Set(['603', '607']);

export function voiceCallFailure(code: VoiceCallFailureCodeEnum): VoiceCallFailure {
  return { code, message: MESSAGES[code] };
}

export interface CallInitiationFailureEvent {
  type?: string;
  data?: {
    conversation_id?: string;
    failure_reason?: string;
    metadata?: {
      type?: string;
      body?: Record<string, unknown>;
    };
  };
}

/**
 * Busy and no-answer arrive on the initiation-failure webhook, not on the dial
 * response. Twilio `failed` is reported as `unknown`; the body distinguishes a
 * bad number and a decline from a carrier failure.
 */
export function voiceFailureFromInitiation(event: CallInitiationFailureEvent): VoiceCallFailure {
  const body = event.data?.metadata?.body ?? {};
  const errorCode = textOf(body.ErrorCode ?? body.error_code);
  const sip = textOf(body.SipResponseCode ?? body.sip_status_code);
  const callStatus = textOf(body.CallStatus ?? body.call_status).toLowerCase();

  if (INVALID_NUMBER_CODES.has(errorCode)) {
    return voiceCallFailure(VoiceCallFailureCodeEnum.INVALID_NUMBER);
  }

  if (REJECTED_SIP_CODES.has(sip) || callStatus === 'canceled' || callStatus === 'cancelled') {
    return voiceCallFailure(VoiceCallFailureCodeEnum.REJECTED);
  }

  const reason = event.data?.failure_reason;
  if (reason === 'busy') {
    return voiceCallFailure(VoiceCallFailureCodeEnum.BUSY);
  }

  if (reason === 'no-answer') {
    return voiceCallFailure(VoiceCallFailureCodeEnum.NO_ANSWER);
  }

  return voiceCallFailure(VoiceCallFailureCodeEnum.CARRIER_FAILURE);
}

/** Synchronous dial rejection. The phone has not rung. */
export function voiceFailureFromDialError(bodyText: string): VoiceCallFailure {
  const text = bodyText.toLowerCase();

  if (isInvalidNumberText(text)) {
    return voiceCallFailure(VoiceCallFailureCodeEnum.INVALID_NUMBER);
  }

  if (/\bbusy\b/.test(text)) {
    return voiceCallFailure(VoiceCallFailureCodeEnum.BUSY);
  }

  if (/no[-\s]?answer/.test(text)) {
    return voiceCallFailure(VoiceCallFailureCodeEnum.NO_ANSWER);
  }

  if (/reject|declin/.test(text)) {
    return voiceCallFailure(VoiceCallFailureCodeEnum.REJECTED);
  }

  return voiceCallFailure(VoiceCallFailureCodeEnum.CARRIER_FAILURE);
}

function isInvalidNumberText(text: string): boolean {
  if ([...INVALID_NUMBER_CODES].some((code) => text.includes(code))) {
    return true;
  }

  return /invalid (phone )?number/.test(text) || /not a valid (phone )?number/.test(text) || /e\.?164/.test(text);
}

function textOf(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  return '';
}
