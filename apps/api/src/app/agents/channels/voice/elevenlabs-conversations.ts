import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { elevenLabsApiBase, readVoiceChannelConfig } from './voice-config';

export type ElevenLabsRecording = {
  body: Buffer;
  contentType: string;
};

/**
 * Fetches the audio recording for one ElevenLabs conversation.
 * Returns null when the conversation has no audio yet (or never will).
 */
export async function fetchRecording(conversationId: string): Promise<ElevenLabsRecording | null> {
  const config = readVoiceChannelConfig();
  if (!config) {
    throw new BadGatewayException({
      code: 'voice_not_configured',
      message: 'Voice is not configured on this deployment. Set the shared Twilio number and ElevenLabs credentials.',
    });
  }

  let response: Response;
  try {
    response = await fetch(
      `${elevenLabsApiBase()}/v1/convai/conversations/${encodeURIComponent(conversationId)}/audio`,
      {
        method: 'GET',
        headers: { 'xi-api-key': config.elevenLabsApiKey },
      }
    );
  } catch {
    throw new BadGatewayException({
      code: 'voice_recording_unavailable',
      message: 'Could not reach ElevenLabs for the call recording.',
    });
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new BadGatewayException({
      code: 'voice_recording_unavailable',
      message: `ElevenLabs returned ${response.status} for the call recording.`,
    });
  }

  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'audio/mpeg';
  const body = Buffer.from(await response.arrayBuffer());

  return { body, contentType };
}

/** Same as fetchRecording, but 404 when ElevenLabs has nothing. */
export async function requireRecording(conversationId: string): Promise<ElevenLabsRecording> {
  const recording = await fetchRecording(conversationId);
  if (!recording) {
    throw new NotFoundException(`No recording was found for conversation "${conversationId}".`);
  }

  return recording;
}
