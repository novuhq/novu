# Voice bridge live tuning (NV-9171)

After provisioning the shell with `provision-voice-shell.ts` and setting `NOVU_VOICE_BRIDGE_SECRET`, place a real call and verify:

1. **Keepalive vs cascade timer.** With `NOVU_VOICE_BRIDGE_PARK_MS` at the default `12000`, confirm ElevenLabs does not drop the custom LLM request before the agent posts a line. If the shell still cascade-times out around 4–15s despite keepalive chunks, leave the park bound under `cascade_timeout_seconds` (15) and rely on `turn_timeout` re-invokes. If keepalives clearly reset the timer, raise `NOVU_VOICE_BRIDGE_PARK_MS` toward the full call budget. Also confirm an empty keepalive chunk does not count as first output — if it does, it will silence `soft_timeout_config` and leave dead air. Run this check on the same call as step 2.
2. **Soft-timeout fillers.** The bridge does not speak its own holding line. When the park expires it finishes the stream with no content. Stay silent on the agent side for ~20s and confirm the person hears the configured fillers (`Hmm.`, `One moment.`, …) from `soft_timeout_config`, not dead air and not a second "One moment." from the bridge.
3. **Duration goodbye.** Let a call run to `max_duration_seconds` (300) and confirm `max_conversation_duration_message` is spoken before hangup, and that `post_call_transcription` expires the interaction.
