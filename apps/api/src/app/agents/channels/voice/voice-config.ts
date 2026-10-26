export type VoiceChannelConfig = {
  twilioNumber: string;
  elevenLabsPhoneNumberId: string;
  elevenLabsAgentId: string;
  elevenLabsApiKey: string;
};

/**
 * The one shared number for the deployment. Returns null unless every value is
 * set, so a half-configured environment cannot provision the channel.
 * NV-9170 is what places the call; this ticket only refuses to link without them.
 */
export function readVoiceChannelConfig(): VoiceChannelConfig | null {
  const twilioNumber = process.env.NOVU_VOICE_TWILIO_NUMBER?.trim();
  const elevenLabsPhoneNumberId = process.env.NOVU_VOICE_ELEVENLABS_PHONE_NUMBER_ID?.trim();
  const elevenLabsAgentId = process.env.NOVU_VOICE_ELEVENLABS_AGENT_ID?.trim();
  const elevenLabsApiKey = process.env.NOVU_VOICE_ELEVENLABS_API_KEY?.trim();

  if (!twilioNumber || !elevenLabsPhoneNumberId || !elevenLabsAgentId || !elevenLabsApiKey) {
    return null;
  }

  return { twilioNumber, elevenLabsPhoneNumberId, elevenLabsAgentId, elevenLabsApiKey };
}

/** Global host unless the deployment pinned a residency region. */
export function elevenLabsApiBase(): string {
  const configured = process.env.NOVU_VOICE_ELEVENLABS_API_BASE?.trim();

  return (configured || 'https://api.elevenlabs.io').replace(/\/$/, '');
}
