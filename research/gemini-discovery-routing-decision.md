# NV-8866: What does the routing decision look like, and which mechanism can make it?

Legend: **[D]** documented (source cited) · **[I]** inferred by us · **[P]** needs prototype (NV-8874)

## Answer

1. **Recommended: a hybrid.** Build the candidate list from Agent Registry and cache it per conversation. When there are more than 8 candidates, cut them to 8 with Gemini embeddings. Then Jev makes one choice question per message over these options: `stay`, up to 8 agents, and `direct` [I].
2. **Why Jev decides and not Gemini.** Jev returns per-option probabilities, and that is its given contract. Current Gemini models (3.x) no longer return logprobs [D]. A Gemini confidence would therefore be something the model reports about itself, and it is not calibrated [I].
3. **How probabilities map to actions.** Stay when the sticky agent is still close to the top (p ≥ 0.35, gap < 0.25). Forward when there is a clear winner (p ≥ 0.70, gap ≥ 0.20). Answer directly when `direct` has p ≥ 0.60. In every other case, show a `ctx.choose` card with the top 2–4 options [I, calibrate in P].
4. **Where it runs.** User code at the top of the Discovery Agent's `onMessage`, before any forwarding. The framework has no routing hook. The user's pick comes back on `onAction` through `ctx.humanResponse` [D, repo].
5. **Fallback.** The same pipeline with Gemini 3.5 Flash-Lite in the decider slot: structured JSON output with enum-constrained ids, a categorical confidence (`high`/`medium`/`low`), and minimal thinking [D for features, I for the design].
6. **Marketplace risk.** The Marketplace requires "Google foundation or 3rd party models hosted in Model Garden as a default configuration" [D]. A non-Model-Garden Jev on every message is a possible conflict. This is an owner decision. It does not block the demo, because the MVP has no real listing (standing decision 4).

## Inputs

### Per agent: what we actually have

| Source | Fields usable for routing | Notes |
|---|---|---|
| Agent Registry `Agent` [D] | `displayName`, `description`, `skills[].{id,name,description,tags,examples}`, `card.content` (full A2A card), `protocols[].type` (`A2A_AGENT` / `CUSTOM`), `attributes` (framework, runtime) | There are **no agent-level tags**; tags exist only per skill. `description` is "Empty if Agent Card has no description". All of these fields are output-only and "often obtained from the A2A Agent Card". |
| Gemini Enterprise (Discovery Engine) `Agent` v1alpha [D] | `displayName` and `description` (both "might be used by an LLM to automatically select an agent"), `agentInvocationSpec.description` ("used by the LLM to decide when to invoke the agent"), `starterPrompts[].text`, `state`, `sharingConfig.scope`, `a2aAgentDefinition.jsonAgentCard` | `agents.list` "Lists all Agents under an Assistant **which were created by the caller**". It is not a tenant-wide list for other users' agents. That makes Agent Registry the candidate source [D + I]. |

**Compact option text per agent [I]:** at most about 600 characters, which is about 150 tokens at "about 4 characters" per token [D, tokens doc]. It contains:
- `displayName`
- `agentInvocationSpec.description`, or `description` when the first is missing
- up to 3 skill names
- up to 2 examples, taken from `skills[].examples` or `starterPrompts`

Candidates that are not `ENABLED`, or that have no forwarding path (NV-8864), are dropped before routing. They can only get the "Open @Agent" card [I].

### Conversation history

- Novu sends up to **50** history entries per turn (`AGENT_HISTORY_LIMIT = 50`) [D, repo]. The entries have `role`, `type`, `content`, and `createdAt` [D, repo].
- **Proposal [I]:** use the last 3 user messages plus the last assistant reply. Keep only `type === 'message'` entries and truncate each to 400 characters, which comes to about 600 tokens. Short follow-ups such as "and for March?" only make sense next to the previous turn. Older turns mostly add noise to a classifier. Tune the window in [P].

### Sticky state

Keep this in `ctx.metadata`, which persists per conversation and is flushed with the next reply [D, repo]:

```json
{ "route": { "agentId": "projects/…/agents/deep-research", "taskId": "…", "taskState": "completed", "turnsWithAgent": 3 } }
```

- If `taskState === 'input-required'`, skip routing and send the reply to the same task. This is the map's open assumption [I].
- If the turn is the answer to our own choice card, skip routing too (see "Where it plugs in").

## Output and thresholds

**Options per decision:**
- `stay`, only when a sticky agent exists
- up to 8 candidate agents, with the sticky agent always included
- `direct`, meaning the Discovery Agent answers itself (help, "which agents do we have?", small talk)

"Ask" is not an option. It is what low confidence produces [I].

With p1 as the top probability and p2 as the second, check these rules in order [I]:

| # | Condition | Action |
|---|---|---|
| 1 | Sticky agent S exists, p(S) ≥ 0.35 and p1 − p(S) < 0.25 | **Stay**: forward to S |
| 2 | Top option is an agent, p1 ≥ 0.70 and p1 − p2 ≥ 0.20 | **Forward** (a switch when it isn't S) |
| 3 | Top option is `direct` and p1 ≥ 0.60 | **Answer directly** |
| 4 | 2–4 options have p ≥ 0.15 | **Choice card** (`ctx.choose`) listing them by p, plus "None of these" |
| 5 | Otherwise (flat distribution) | **Answer directly**: say no agent matched and suggest the top 3 |

**Reasoning behind the numbers [I]:**
- A wrong forward costs a full run of the target agent, and Deep Research is long-running. The user then has to recover with "Change agent". A card costs one click. So forwarding needs a clear winner.
- With 5–10 options, a uniform guess gives each option 0.10–0.20. A threshold of 0.70 is at least 3.5× that, and a gap of 0.20 rules out near-ties.
- Follow-up messages are short and ambiguous, so staying with the current agent only needs 0.35. A switch has to beat the current agent by 0.25. This gap stops the router flipping between agents.
- 0.15 is roughly the uniform level. Options below it are not worth a button.
- `ctx.choose` accepts 2–10 options [D, repo]. The card shows at most 4 so it can be read at a glance.
- Calibrate all thresholds in [P] on about 30 labelled messages.

**Gemini fallback mapping [I]:** `high` → rules 1–3, `medium` → rule 4, `low` → rule 5.

## Mechanisms compared

Every mechanism answers the same question: "Given this message, the recent turns, and the current agent, which of {stay, A…H, direct}?"

| Mechanism | Per-option confidence | Uses history and sticky agent | Option ceiling | Calls per message | Marketplace default-model fit | Verdict |
|---|---|---|---|---|---|---|
| (a) Jev | Yes, native probabilities (given) | Yes, through the question context | Unknown [P] | 1 | At risk (not known to be in Model Garden) [I] | **Decider (recommended)** |
| (b) Gemini, structured output | No logprobs on 3.x [D]. Only a self-reported number or category, uncalibrated [I] | Yes | No numeric cap documented, but "enums with many values" can cause `400` [D] | 1 | Compliant [D] | **Decider fallback** |
| (c) Gemini embeddings over agent cards | Cosine similarity, not a probability [I] | Weak: one text of up to 2,048 tokens, and it can't express "stay" or "direct" [D + I] | None | 1 query embedding; card vectors are precomputed | Compliant (Gemini model) | **Shortlister only** |
| (d) Agent Registry `agents:search` | None. Boolean keyword match, no score in the response, order unspecified [D] | No | `pageSize` capped at 100 [D] | 1 (cacheable) | Not applicable (no model) | **Candidate source only** |
| (e) Hybrid: (d), then (c) when N > 8, then (a) or (b) | The decider's confidence | Yes | 8 agents + `stay` + `direct` = 10 or fewer | 1–3 | Same as the decider | **Recommended architecture** |

**Notes:**
- **(b) logprobs:** `responseLogprobs` and `logprobs` still exist in `generationConfig`. The reference says both are "deprecated for Gemini 3.x models and will soon be completely deprecated" [D]. The Gemini API tells new projects to use 3.5 Flash-Lite or 3.8 Flash and limits 2.5 to "users who have actively used them in the past" [D]. Logprobs are therefore not a practical confidence source.
- **(b) structured output:** `text/x.enum` returns exactly one enum value, and JSON mode enforces `responseSchema` [D]. "The size of your response schema counts towards the input token limit" [D].
- **(b) latency lever:** 3.5 Flash-Lite defaults to `minimal` thinking. The docs recommend "minimal or low thinking for … classification" [D]. 3.8 Flash has no `minimal` level; its lowest is `low` [D].
- **(c) embedding limits:** `gemini-embedding-001` has a 2,048-token input and up to 3,072 dimensions. Task types include `CLASSIFICATION` and `RETRIEVAL_QUERY`/`RETRIEVAL_DOCUMENT` [D]. On Agent Platform, "each request can only include a single input text" for this model, so card vectors should be precomputed and cached per organisation [D + I].
- **(d) search limits:** the searchable fields are `agentId`, `name`, `displayName`, `description`, and `skills.*`, with operators `= : NOT AND OR ()` and suffix `*` [D]. Semantic search is documented only for **standalone skills** (`skills search --search-type=semantic`, alpha), not for agents [D]. Turning a free-text message into a `searchString` would be our own keyword extraction, so (d) cannot rank candidates [I].

## Feasibility limits

1. **Agents per decision:**
   - The token budget is not what limits it. 10 options × about 150 tokens + about 600 history + about 300 instructions ≈ 2.5k tokens, against a 1,048,576-token input limit on 3.5 Flash-Lite [D + I]. Even 100 agents (the registry page cap) would be about 15k tokens.
   - The real limits are option counts: `ctx.choose` takes 2–10 options [D, repo], Gemini warns about large enums [D], and Jev's option limit is unknown [P].
   - Hence: shortlist to 8 or fewer agents, plus `stay` and `direct` [I].
2. **Added latency per message:**
   - Google publishes **no numeric latency** for Flash-Lite, embeddings, or Agent Registry search. They are described only qualitatively: Flash-Lite as "low-latency" [D], and registry keyword mode as "optimized for low-latency searches" [D]. The only Google claim is that controlled generation "adds minimal latency", from a Google Developers Blog post about Gemini 1.5 [D, blog, dated].
   - Expected added calls [I]:
     - registry search: 0 on most turns (cached per conversation), 1 on a miss
     - query embedding: 1, only when N > 8
     - decider: 1
   - Measure p50 and p95 per call and end to end [P].
   - While the decision runs, show `ctx.typing('Finding the right agent…')` [D, repo].
3. **Marketplace default model:**
   - A2A listing requirement: "Use Google foundation or 3rd party models hosted in Model Garden as a default configuration" [D].
   - AI Agent Ecosystem Program: "Uses a Gemini model or a third-party model from the Model Garden" [D].
   - It is undocumented whether a classifier in the default path of every message counts as the agent's "model configuration". If Jev is not a Model Garden model, a strict reviewer could flag it [I].
   - Mitigation options (owner decision): make the Gemini decider the default configuration with Jev as an opt-in, or host Jev through Model Garden. Not blocking for the MVP (mock listing).
4. **Candidate completeness:** whether Deep Research, no-code agents, and Marketplace agents appear in Agent Registry is not documented. NV-8871 covers it [P].

## Where it plugs into @novu/framework

1. The bridge request enters `dispatchAgentEvent`. It builds `AgentContextImpl`, queues run-start, and calls `runAgentHandler` (`packages/framework/src/resources/agent/agent-dispatch.ts:127-135`).
2. For `onMessage` events, `runAgentHandler` calls `handlers.onMessage(message, ctx)` and posts whatever it returns (`agent-dispatch.ts:211-218`, `dispatchReplyResult` at `agent-dispatch.ts:63-78`). With the AI SDK adapter, the user's `onMessage` is wrapped at `packages/framework/src/ai-sdk/ai-sdk-agent.ts:55-65`.
3. **The routing decision runs as the first code in `onMessage`, before any `streamText` or forwarding.** There is no framework routing hook: `AgentHandlers` exposes only event handlers (`agent.types.ts:837-889`) [D, repo]. The inputs available at this point:
   - `message.text` / `message.markdown` (`agent.types.ts:178-194`)
   - `ctx.history` (`agent.types.ts:605-610`, entry shape at `280-297`)
   - sticky state from `ctx.metadata.get('route')` (`agent.types.ts:648-662`, `agent.context.ts:487-507`)
   - `ctx.humanResponse`, which is set when this turn answers an `ask` (`agent.types.ts:599-604`)
4. **Choice card:** call `ctx.choose(question, options)` and return. It checks for 2–10 options (`human/assert.ts:36-44`), queues a human signal (`agent.context.ts:653-693`), and is flushed after the handler (`agent-dispatch.ts:134`).
   - Store the pending message and the option-id → agent map in `ctx.metadata` before returning.
   - Use short option ids such as `a1`, because each id is embedded in the action id `human:<id>:opt:<optionId>` (`human/action-id.ts:18-20`).
5. **The pick** arrives on `onAction`: `handleOnActionEvent` calls `handlers.onAction` for anything that is not a tool approval (`agent-dispatch.ts:205-208`). `ctx.humanResponse` then carries `kind: 'choose'`, `optionId`, and `expired` (`agent.types.ts:120-140`). The AI SDK adapter passes `onAction` through unchanged (`ai-sdk-agent.ts:85`).
   - Forward the stored message to the picked agent and update `route`.
   - If the pick expired, answer directly.
6. The metadata writes from steps 3–5 are queued signals, flushed with the next reply or when the handler completes (`agent.context.ts:490-507`, `agent.types.ts:650-651`).

## Recommended request/response shape

The Jev contract is a black box: "a choice question with per-option probabilities". The field names below are our proposal [I].

```json
{
  "request": {
    "question": "Which option should handle the user's latest message?",
    "context": "Current agent: Deep Research (3 turns). Recent turns:\nUSER: Research EU AI Act obligations for HR tools\nASSISTANT (Deep Research): Report ready: ...\nUSER: Now draft a leave request for next Friday",
    "options": [
      { "id": "stay",  "label": "Continue with Deep Research: investigates complex topics and writes cited reports" },
      { "id": "a1",    "label": "HR Assistant: leave requests, payroll questions. Examples: 'Book PTO next Friday'" },
      { "id": "a2",    "label": "Travel Booker: flights and hotels. Examples: 'Book a flight to Berlin'" },
      { "id": "direct","label": "Answer directly: help, questions about available agents, small talk" }
    ]
  },
  "response": {
    "probabilities": { "stay": 0.06, "a1": 0.83, "a2": 0.03, "direct": 0.08 }
  },
  "decision": {
    "action": "forward",
    "agentId": "projects/p/locations/global/agents/hr-assistant",
    "switchedFrom": "projects/p/locations/global/agents/deep-research",
    "rule": "p1>=0.70 && p1-p2>=0.20",
    "p1": 0.83,
    "p2": 0.08
  }
}
```

## Fallback

1. **Decider fallback:** use this when Jev is unavailable, times out (more than 2 s, a proposed budget [I]), or the Marketplace default-model rule applies. Put `gemini-3.5-flash-lite` in the decider slot with:
   - `thinking_level: minimal`
   - `responseMimeType: application/json`
   - `responseSchema` = `{ choice: enum[ids], runnerUp: enum[ids], confidence: enum["high","medium","low"] }` with `propertyOrdering` [D for features]

   Use categorical confidence instead of a number, because the number would be self-reported [I].
2. **Degraded fallback:** use this when both deciders fail. Stay with the sticky agent if there is one. Otherwise show the top 3 embedding matches as a choice card [I].
3. **No candidates** (the registry is empty or unreachable): answer directly and show "Open @Agent" cards for known agents [I].

## Open questions for the prototype

1. **Jev behaviour:** what its option limit, latency, and calibration are on our 4-option shape [P].
2. **Thresholds:** check the 0.35 / 0.70 / 0.20 / 0.60 / 0.15 values against about 30 labelled messages over the 3 demo agents [P].
3. **Registry coverage:** whether Deep Research, the no-code agent, and the A2A agent appear in Agent Registry, and with which fields filled in. Shared with NV-8871 [P].
4. **Latency:** p50 and p95 for registry search, the query embedding, Jev, and the Flash-Lite fallback, plus the end-to-end time from message to first token [P].
5. **Cache freshness:** whether caching the candidate list per conversation misses newly added agents. Proposed TTL: 10 minutes [P].

**Owner decision (not a prototype):** whether Jev in the default path is acceptable under the Marketplace "default configuration" rule.

## Sources

**Google (primary):**
- Agent Registry `Agent` resource v1: https://docs.cloud.google.com/agent-registry/reference/rest/v1/projects.locations.agents
- Agent Registry `agents.search` v1: https://docs.cloud.google.com/agent-registry/reference/rest/v1/projects.locations.agents/search
- Agent Registry search modes: https://docs.cloud.google.com/agent-registry/search-agents-and-tools
- Gemini Enterprise `Agent` resource v1alpha: https://docs.cloud.google.com/gemini/enterprise/docs/reference/rest/v1alpha/projects.locations.collections.engines.assistants.agents
- Gemini inference reference: https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/models/inference
- Structured output limits: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/control-generated-output
- Gemini API structured output: https://ai.google.dev/gemini-api/docs/structured-output
- Gemini models list: https://ai.google.dev/gemini-api/docs/models
- Gemini 3.5 Flash-Lite: https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite
- Thinking levels: https://ai.google.dev/gemini-api/docs/thinking
- Tokens: https://ai.google.dev/gemini-api/docs/tokens
- `gemini-embedding-001`: https://ai.google.dev/gemini-api/docs/models/gemini-embedding-001
- Text embeddings on Agent Platform: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/embeddings/get-text-embeddings and https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/models/text-embeddings-api
- Marketplace A2A agent requirements: https://docs.cloud.google.com/marketplace/docs/partners/ai-agents
- AI Agent Ecosystem Program requirements: https://docs.cloud.google.com/gemini-enterprise-agent-platform/machine-learning/ai-agent-ecosystem-overview
- Controlled generation "adds minimal latency": https://developers.googleblog.com/en/mastering-controlled-generation-with-gemini-15-schema-adherence/

**Repository (`novuhq/novu`):**
- `packages/framework/src/resources/agent/agent-dispatch.ts`, lines 63-78, 127-168, 170-209, 211-262
- `packages/framework/src/resources/agent/agent.types.ts`, lines 17-51, 120-140, 178-211, 280-297, 580-790, 837-889
- `packages/framework/src/resources/agent/agent.context.ts`, lines 487-507, 600-633, 653-693
- `packages/framework/src/resources/agent/human/assert.ts`, lines 36-44
- `packages/framework/src/resources/agent/human/action-id.ts`, lines 18-20
- `packages/framework/src/resources/agent/agent.resource.ts`, lines 9-19
- `packages/framework/src/ai-sdk/ai-sdk-agent.ts`, lines 35-87
- `apps/api/src/app/agents/conversation-runtime/conversation/agent-conversation.helpers.ts`, line 5 (`AGENT_HISTORY_LIMIT = 50`)
