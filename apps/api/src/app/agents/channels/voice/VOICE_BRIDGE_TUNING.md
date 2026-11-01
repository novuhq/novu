# Voice bridge live tuning (NV-9171)

After provisioning the shell with `provision-voice-shell.ts` and setting `NOVU_VOICE_BRIDGE_SECRET`, place a real call and verify:

1. **Keepalive vs cascade timer.** With `NOVU_VOICE_BRIDGE_PARK_MS` at the default `12000`, confirm ElevenLabs does not drop the custom LLM request before the agent posts a line. If the shell still cascade-times out around 4–15s despite keepalive chunks, leave the park bound under `cascade_timeout_seconds` (15) and rely on `turn_timeout` re-invokes. If keepalives clearly reset the timer, raise `NOVU_VOICE_BRIDGE_PARK_MS` toward the full call budget. Also confirm an empty keepalive chunk does not count as first output — if it does, it will silence `soft_timeout_config` and leave dead air. Run this check on the same call as step 2.
2. **Soft-timeout fillers.** The bridge does not speak its own holding line. When the park expires it finishes the stream with no content. Stay silent on the agent side for ~20s and confirm the person hears the configured fillers (`Hmm.`, `One moment.`, …) from `soft_timeout_config`, not dead air and not a second "One moment." from the bridge.
3. **Duration goodbye.** Let a call run to `max_duration_seconds` (300) and confirm `max_conversation_duration_message` is spoken before hangup, and that `post_call_transcription` expires the interaction.

## Sounding human

The conversation shell runs `eleven_v4_turbo` with `stability` 0.35, `similarity_boost` 0.75 and `expressive_mode`, on Alexandra (`kdmDKE6EkgrWrrykO9Qt`). Flash v2 and the 2023 premade voices are what made it sound like a read-aloud ticket, and that premade set retires on 2026-12-31.

Two things follow from v4 and are easy to undo by accident:

- v4 ignores SSML `<break>` and `speed`. The verification shell stays on Flash v2, where `speed` is what paces the spoken code.
- v4 reads `[...]` as an audio-tag direction. `openingLineFor` strips brackets so a card titled `[URGENT] Deploy failed` does not lose its first word.

The opening line is a greeting, the agent's name when its operator chose one, then the card: `Hi, it's Scout. Approve the deploy? Production, now.` There is no stock phrase between the hello and the ask. The card is written by the calling agent as words to be heard (why they're calling, then the question), and per-turn lines are still whatever that agent posts to `voice_turn`. How conversational the call sounds is that wording, not the shell's.

## Verification shell (NV-9173)

`provision-voice-shell.ts` also upserts a second agent, printed as `NOVU_VOICE_ELEVENLABS_VERIFY_AGENT_ID`. It is not the conversation shell:

- `first_message` is `{{verification_line}}`. The dial passes that variable. There is no custom LLM and no `custom_llm_extra_body`, so the call never hits `/v1/human/voice/chat/completions`.
- ElevenLabs still requires an LLM. The prompt's only instruction is to call the built-in `end_call` tool and say nothing. `max_duration_seconds` is 60, the shortest value ElevenLabs accepts, which hangs up if that tool call does not land.
- `record_voice` is false and retention is 0 days. A verification call leaves no recording and no transcript.
- The shared Twilio number stays assigned to the conversation shell. A verification dial names the verification agent id on that same phone-number id.

### Reading the code aloud

`verificationLineFor` writes the code as digit words separated by commas — `Your code is four, two, one, nine. Once more: …` — and carries no markup at all.

The code is four digits (`VOICE_VERIFICATION_CODE_LENGTH`), because it is heard once and typed back from memory. What bounds a guessing attack is `VOICE_VERIFICATION_MAX_ATTEMPTS` (5, after which the code is burned and only a new call brings it back), the ten-minute TTL, and the fact that every retry rings the owner's phone.

Both halves of that are ElevenLabs' own guidance, and both were learned the hard way:

- **Words, not digits.** Numbers should be written the way they are meant to be heard; a bare `421903` is read as a quantity, and small models are the worst at it.
- **Commas, not `<break>` tags.** A tag between every digit put eleven of them in one generation. Their docs warn that too many break tags in a single generation destabilize the voice — "the AI might speed up, or introduce additional noises or audio artifacts" — which is exactly how it sounded: clipped and oddly hurried. Pacing belongs in the shell's `speed`, not in the line.

Live check, with `NOVU_VOICE_PROVE_VERIFY_TO` set to one E.164 number:

1. The phone rings from the shared number and the spoken line is the code that was passed, one digit at a time and unhurried, then repeated.
2. The call ends within a few seconds, without waiting for the person to speak.
3. The API log shows no bridge request for that conversation.
