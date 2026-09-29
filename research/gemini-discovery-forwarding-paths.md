# NV-8864: Which forwarding path reaches each agent type?

Researched 2026-09-29. Legend: **[D]** means documented, and a source is cited. **[I]** means inferred from documented facts. **[T]** means it needs a sandbox test in NV-8872.

## Answer

Google documents two ways to forward a message through Gemini Enterprise, and each serves different agent types. Both are listed as "Invoke an agent programmatically" on the [Agents overview](https://docs.cloud.google.com/gemini/enterprise/docs/agents-overview) [S10].

- **`streamAssist` with `agentsSpec`** reaches Core Assistant, Deep Research, and Agent Designer (now Workflow Builder) *chat* agents. It explicitly does **not** reach workflow agents, A2A agents, or ADK agents [D, S1].
- **The Discovery Engine A2A proxy** (`…/agents/{id}/a2a/v1/message:send|stream`) reaches **A2A agents only**. Calling it for a non-A2A agent returns `400 "Unsupported agent"`. Only `card`, `message:send`, and `message:stream` are supported. The `tasks/*` methods are listed in the discovery document but are not supported for this binding [D, S2].
- **ADK agents** have no path through Gemini Enterprise. The only documented route is calling Agent Runtime `:streamQuery` directly, which needs `aiplatform.reasoningEngines.query` on the agent owner's reasoning engine [D, S18, S21].
- **Marketplace agents** are stored as A2A agents (`a2aAgentDefinition.cloudMarketplaceConfig`) [D, S5, S13], so the proxy should reach them. No page confirms this [I/T].
- **`input-required`** does not survive the round trip as a documented feature on any Gemini Enterprise path. The proxy returns a `message` carrying a session-based `contextId`, and `tasks/*` is unsupported. `streamAssist` has no task states at all [D, S2, S6]. Deep Research's plan confirmation is handled as a second turn in the same session [D, S9].

| Agent type | A2A proxy | `streamAssist` + `agentsSpec` | Direct Agent Runtime | Result |
|---|---|---|---|---|
| Core Assistant (Made by Google) | No: not an A2A agent [D, S2] | **Yes** [D, S1] | n/a | `streamAssist` |
| Deep Research (Made by Google) | No [D, S2] | **Yes**, `agentId: "deep_research"`, API is GA with an allowlist [D, S9] | n/a | `streamAssist` |
| Agent Designer / Workflow Builder chat agent | No [D, S2] | **Yes**, read-only work only; actions that change data are unsupported [D, S1] | n/a | `streamAssist` |
| Workflow Builder workflow agent | No [D, S2] | **No** [D, S1]; conflicting hint in v1alpha `mentionMode` [S7] [T] | n/a | Open @Agent card |
| Custom A2A agent | **Yes** [D, S2] | **No** [D, S1] | Only when hosted on Agent Runtime: its own A2A endpoint, Preview [D, S20] | A2A proxy |
| ADK agent on Agent Runtime | No: non-A2A returns 400 [D, S2; I for ADK specifically] | **No** [D, S1] | **Yes**, `:streamQuery`, needs owner-project IAM [D, S18, S21] | Direct `streamQuery`, else Open @Agent card |
| Marketplace agent (A2A) | Probably [I, S5, S13] [T] | **No**: it is an A2A agent [D, S1] | n/a | A2A proxy [T] |

## Paths

### Path 1: Discovery Engine A2A proxy

- **Endpoint** [D, S3, S5]:
  - `POST https://{LOC-}discoveryengine.googleapis.com/v1/projects/{PROJECT_NUMBER}/locations/{LOC}/collections/default_collection/engines/{ENGINE}/assistants/default_assistant/agents/{AGENT_ID}/a2a/v1/message:send`
  - Streaming uses `…/a2a/v1/message:stream`, and the card is at `GET …/a2a/v1/card`.
  - The proxy exists **only in v1**. The v1alpha and v1beta discovery documents have no `a2a` methods [D, S5 revision 20260924].
  - The URL uses the project **number** [D, S2].
  - Get the base URL from Agent Registry: `protocols[type=A2A_AGENT].interfaces[protocolBinding=HTTP_JSON].url` [D, S2]. For agents created directly in the app, the same URL can be built from the agent's resource name [I/T].
- **Minimal body** [D, S2]:
  ```json
  {"message": {"messageId": "<uuid>", "role": "ROLE_USER", "content": [{"text": "…"}], "contextId": "<optional, from previous reply>"}}
  ```
  - This is the **A2A protobuf/REST shape**, not the v0.3 JSON-RPC shape. `role:"user"` returns 400, and `parts` returns 400 `Unknown name 'parts'` [D, S2].
  - Optional `configuration` fields: `blocking`, `historyLength`, `acceptedOutputModes`, `pushNotification`. Optional `metadata` [D, S3, S5].
- **Response** [D, S2, S3]:
  - Returns either a `task` or a `message`. The documented example returns `message` with `role: ROLE_AGENT`, `content[].text`, and `contextId`.
  - The `contextId` is a Gemini Enterprise session name: `projects/{N}/locations/{L}/collections/default_collection/engines/{E}/sessions/{S}`.
- **Streaming** [D, S2, S4]:
  - `message:stream` returns a **JSON array of chunks over HTTP**. Chunks carry `content[].text`, `metadata.sessionInfo`, and `metadata.assistToken`.
  - The schema is `StreamResponse`, one of `task`, `message`, `statusUpdate`, or `artifactUpdate` [D, S5].
  - This differs from A2A v0.3, which requires SSE for HTTP+JSON streaming [D, S23 §3.3.3]. Whether `?alt=sse` gives SSE is [T].
- **Sessions and `contextId`** [D, S2]: Save the returned `contextId` and send it as `message.contextId` on the next turn.
- **`input-required`** [D, S2, S4, S5; T]:
  - The schema has `TASK_STATE_INPUT_REQUIRED` ("interrupted state") and `Message.taskId`.
  - The guide says only card, send, and stream are supported, so `tasks/get`, `:subscribe`, `:cancel`, and push configs are unsupported even though they appear in the discovery document.
  - Whether a downstream agent's `input-required` Task comes back as a `task`, and whether resending with `taskId` + `contextId` resumes it, is **not documented [T]**. A2A v0.3 resumes by sending the same `taskId` + `contextId` [D, S23 "multi-turn" example].
- **IAM** [D, S2]:
  - Invoking needs `discoveryengine.assistants.assist`, for example `roles/discoveryengine.editor`. `roles/discoveryengine.agentspaceUser` also contains this permission [D, S15].
  - Registry discovery needs `roles/agentregistry.viewer`.
  - `GetAgentCard` checks `discoveryengine.agents.get` [D, S4]. The RPC reference lists no IAM permission for send, stream, or tasks [D, S4].
- **OAuth scopes** [D, S3, S4]: One of `cloud-platform`, `discoveryengine.readwrite`, or `discoveryengine.serving.readwrite`. The guide uses `cloud-platform` [S2].
- **Quotas**:
  - No proxy-specific quota is documented.
  - When the target A2A agent runs on Agent Runtime, the agent owner's project is limited to 60 A2A POST calls per minute and 600 GET calls per minute per region [D, S22].
- **Launch stage**:
  - The invoke guide shows no launch-stage banner [D, S2].
  - The `tenant` path parameter is marked "Experimental, might still change for 1.0 release" [D, S3].
  - Registering custom A2A agents is **Preview** [D, S11]. Marketplace A2A agents are **Preview** [D, S13].
  - Gemini Enterprise "supports the A2A v0.3 streaming mechanism" [D, S11].

### Path 2: `streamAssist` with `agentsSpec`

- **Endpoint** [D, S1, S6]:
  - `POST https://{LOC-}discoveryengine.googleapis.com/v1/projects/{PROJECT}/locations/{LOC}/collections/default_collection/engines/{ENGINE}/assistants/default_assistant:streamAssist`
  - It also exists in v1alpha and v1beta [D, S5].
  - Agent IDs come from `GET …/v1alpha/…/assistants/default_assistant/agents`, which returns 404 on v1 and v1beta [D, S1].
- **Minimal body** [D, S1]:
  ```json
  {"query": {"text": "…"}, "session": "<optional session name>", "agentsSpec": {"agentSpecs": [{"agentId": "<numeric id | deep_research>"}]}}
  ```
  - Deep Research also takes `toolsSpec` (`vertexAiSearchSpec`, `webGroundingSpec`) [D, S9].
  - `agentId` follows RFC-1034 and is at most 63 characters [D, S6].
  - The guide says registered agents use numeric IDs, and that a malformed ID **silently falls back to default orchestration** with no error [D, S1].
  - The web reference also shows `mentionMode` (`DIRECT` / `TOOL` / `TOOL_WORKFLOW_DIRECT`) and `inputVariables` [D, S6, S7]. These fields are **absent** from the 20260924 discovery documents [D, S5] [T].
- **Streaming** [D, S1, S9]:
  - Returns a stream of JSON chunks, a JSON array over REST.
  - Text arrives in `answer.replies[].groundedContent.content.text`. Drop chunks where `thought: true`.
  - `answer.state` moves from `IN_PROGRESS` to `SUCCEEDED`, `SKIPPED`, `FAILED`, or `CANCELLED` [D, S6].
  - SSE is available with `?alt=sse`, as used in Google's codelab [D, S24].
- **Sessions** [D, S1, S6]:
  - The final chunk carries `sessionInfo.session`. Send it back as `session` on the next turn.
  - An empty value or `-` creates a new session.
- **`input-required`**:
  - There is no task or interrupted state. The only states are the `AssistAnswer.state` values above [D, S6].
  - Deep Research returns a `RESEARCH_PLAN` reply, and the caller confirms it by sending `"Start Research"` with the same `session` [D, S9].
  - The Discovery Agent would have to turn such replies into an upstream A2A `input-required` itself [I].
- **IAM** [D, S1, S8]: `discoveryengine.assistants.assist`, for example Discovery Engine Editor or Gemini Enterprise Admin. `agentspaceUser` also has it [D, S15].
- **OAuth scopes**:
  - The guide says `cloud-platform` [D, S1].
  - The reference also accepts `discoveryengine.assist.readwrite`, `discoveryengine.readwrite`, and `discoveryengine.serving.readwrite` [D, S5, S6].
  - Send `X-Goog-User-Project` when calling with Application Default Credentials [D, S1].
- **Quotas**:
  - License quotas, pooled per edition, project, and location: Assistant 160 queries/day per Standard license and 200 per Plus license. Deep Research 3/day on Standard and 10/day on Plus [D, S16].
  - Whether API calls count against these pools is [T].
  - No rate quota specific to `streamAssist` is documented [D, S16].
- **Launch stage**:
  - The v1 method and guide show no banner [D, S1, S8]. File upload is Preview [D, S8].
  - **Deep Research over the API is "Generally available with allowlist"** [D, S9].
- **Limits** [D, S1]: No workflow agents, no A2A or ADK agents, and no programmatic actions that change data (email, calendar, chat). Attempting them "may result in silent failures".

### Path 3: Direct Agent Runtime `streamQuery` (ADK)

- **Endpoint** [D, S18]: `POST https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/{REGION}/reasoningEngines/{ID}:streamQuery?alt=sse`
  - Gemini Enterprise stores the engine name in `adkAgentDefinition.provisionedReasoningEngine.reasoningEngine`, which is readable through v1alpha `agents.get` [D, S12, S14].
- **Minimal body** [D, S18]:
  ```json
  {"class_method": "async_stream_query", "input": {"user_id": "<caller-chosen, ≤128 chars>", "session_id": "<optional>", "message": "…"}}
  ```
  - The `user_id` limit comes from [D, S19].
  - `classMethod` defaults to `stream_query` [D, aiplatform v1 discovery revision 20260920].
- **Streaming** [D, S18]: SSE with `?alt=sse`. Each event is an ADK event.
- **Sessions** [D, S18, S19]:
  - Sessions are Agent Platform managed sessions, created with `class_method: async_create_session`, keyed by `user_id` and `session_id`.
  - They are **separate from Gemini Enterprise sessions and `contextId`** [I].
- **`input-required`**: There is no A2A task state. A follow-up is just another `async_stream_query` in the same session [D, S19 "send a response… within the session"].
- **IAM** [D, S21]: `aiplatform.reasoningEngines.query` on the engine, for example `roles/aiplatform.user` or a custom role. This is in the **agent owner's project**, not granted through Gemini Enterprise.
- **OAuth scope** [D, aiplatform v1 discovery]: `cloud-platform` only.
- **Quotas** [D, S22]: 90 Query/StreamQuery calls per minute per project per region, adjustable.
- **Launch stage**:
  - Endpoint is v1, and the ADK "use" page shows no banner [D, S18].
  - Agent Runtime's own A2A endpoint (`{agent_card.url}/v1/message:send`, `/v1/tasks/{id}`, `:cancel`) is **Preview** [D, S20].
- **Caveat** [I/T]: Calling directly bypasses Gemini Enterprise's `authorizationConfig.toolAuthorizations` [S12]. Tools that need the user's OAuth may fail, and Gemini Enterprise sharing and ACLs are not enforced.

## Agent types with no path

These fall back to the "Open @Agent" card.

1. **Workflow Builder workflow agents**: "Workflow agents are not supported" by `streamAssist` [D, S1], and the proxy rejects non-A2A agents [D, S2]. The v1alpha `TOOL_WORKFLOW_DIRECT` option hints that support is coming [S7] [T].
2. **ADK agents on Agent Runtime**, whenever the Discovery Agent lacks `aiplatform.reasoningEngines.query` on the owner's engine, which is the normal case for a Marketplace-installed agent [I]. No path exists through Gemini Enterprise [D, S1, S2].
3. **Dialogflow agents** (registered via `dialogflowAgentDefinition`, [S14]): they are not in `streamAssist`'s supported list [D, S1] and are not A2A [D, S2]. Dialogflow's own API was not researched.
4. **Any Made by Google agent other than Core Assistant or Deep Research**: none is documented as callable. The overview lists only these two [D, S10].
5. **Partial:** Agent Designer chat agents whose main job is an action that changes data can be called, but the action is unsupported [D, S1]. Use "Try here" only for read-only work.

## Open questions for the sandbox

Ticket NV-8872 should cover these.

1. **Proxy and `input-required`**: Does a downstream `input-required` come back as a `task` with `TASK_STATE_INPUT_REQUIRED`? Does resending with `taskId` + `contextId` resume it? What do `tasks/{id}`, `:subscribe`, and `:cancel` return, given they are in the discovery document but "unsupported"?
2. **Proxy streaming framing**: JSON array versus `?alt=sse`. Also check the latency to the first chunk.
3. **Proxy for agents created directly in the app** (not imported from Agent Registry): does a URL built from the agent's resource name work?
4. **Proxy with a Marketplace agent**: does it work, and is the entitlement checked?
5. **Proxy with a user token**: Is it enough for a plain `agentspaceUser`, with no Editor role? Are the agent's sharing ACLs enforced (expect 403 if the agent isn't shared)? Is the agent's `agentAuthorization` OAuth forwarded, or does it fail with `AUTH_REQUIRED` before the user consents?
6. **`streamAssist`**: Confirm the numeric `agentId` works for a Workflow Builder chat agent. Confirm that a wrong ID falls back silently.
7. **`streamAssist` and workflows**: Does `mentionMode: TOOL_WORKFLOW_DIRECT` work for a workflow agent on v1alpha?
8. **Deep Research**:
   - Is the tenant on the API allowlist?
   - Run the `RESEARCH_PLAN` → `"Start Research"` round trip in one session.
   - Measure how long the report takes.
   - Check whether API calls count against the daily limits of 3/10 Deep Research runs and 160/200 Assistant queries.
9. **ADK agents**:
   - Confirm the proxy returns `400 Unsupported agent`.
   - Confirm `streamAssist` falls back silently.
   - Test a direct `streamQuery` from another project with the user's token.
10. **Session sharing**: Can a proxy `contextId` (a Gemini Enterprise session name) be reused as the `streamAssist` `session`, and does it appear in the user's Gemini Enterprise history?
11. **Service account versus user token** on both paths: does it work, what data scope does it get, and what shows in the audit log?

## Sources

- S1 Call a specific agent with the StreamAssist API: https://docs.cloud.google.com/gemini/enterprise/docs/invoke-agent-streamassist
- S2 Call an agent using its registry A2A endpoint: https://docs.cloud.google.com/gemini/enterprise/docs/invoke-agent-a2a
- S3 REST `…agents.a2a.v1.message.send` (v1): https://docs.cloud.google.com/gemini/enterprise/docs/reference/rest/v1/projects.locations.collections.engines.assistants.agents.a2a.v1.message/send
- S4 RPC package `a2a.v1`: https://docs.cloud.google.com/gemini/enterprise/docs/reference/rpc/a2a.v1
- S5 Discovery Engine discovery documents, revision 20260924: https://discoveryengine.googleapis.com/$discovery/rest?version=v1 (also `version=v1alpha` and `version=v1beta`)
- S6 REST `streamAssist` v1: https://docs.cloud.google.com/gemini/enterprise/docs/reference/rest/v1/projects.locations.collections.engines.assistants/streamAssist
- S7 REST `streamAssist` v1alpha: https://docs.cloud.google.com/gemini/enterprise/docs/reference/rest/v1alpha/projects.locations.collections.engines.assistants/streamAssist
- S8 Get search results from StreamAssist: https://docs.cloud.google.com/gemini/enterprise/docs/get-answers-from-streamassist
- S9 Get reports with Deep Research: https://docs.cloud.google.com/gemini/enterprise/docs/research-assistant
- S10 Agents overview: https://docs.cloud.google.com/gemini/enterprise/docs/agents-overview
- S11 Register and manage A2A agents: https://docs.cloud.google.com/gemini/enterprise/docs/register-and-manage-an-a2a-agent
- S12 Register and manage ADK agents: https://docs.cloud.google.com/gemini/enterprise/docs/register-and-manage-an-adk-agent
- S13 Add and manage A2A agents from Google Cloud Marketplace: https://docs.cloud.google.com/gemini/enterprise/docs/register-and-manage-marketplace-agents
- S14 REST resource `…assistants.agents` (v1alpha): https://docs.cloud.google.com/gemini/enterprise/docs/reference/rest/v1alpha/projects.locations.collections.engines.assistants.agents
- S15 Gemini Enterprise IAM roles: https://docs.cloud.google.com/gemini/enterprise/docs/access-control
- S16 Quotas and overages: https://docs.cloud.google.com/gemini/enterprise/docs/quotas-and-overages
- S17 Workflow Builder overview: https://docs.cloud.google.com/gemini/enterprise/docs/workflow-builder
- S18 Use an ADK agent (Agent Runtime): https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/use-an-adk-agent
- S19 Develop an ADK agent: https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/runtime/create-an-adk-agent
- S20 Use an A2A agent (Agent Runtime): https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/use-an-a2a-agent
- S21 Share an agent (`aiplatform.reasoningEngines.query`): https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/share-agent
- S22 Agent Platform quotas: https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/agent-quotas and https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/quotas
- S23 A2A protocol v0.3.0 specification: https://a2a-protocol.org/v0.3.0/specification/
- S24 Google Codelab, Integrate Gemini Enterprise agents with Workspace (`streamAssist?alt=sse`): https://codelabs.developers.google.com/ge-gws-agents
- aiplatform v1 discovery document, revision 20260920 (`streamQuery` scopes and `classMethod`): https://aiplatform.googleapis.com/$discovery/rest?version=v1
- Prior local evidence: `.pi-herdsman/sandbox/orchestration-flags-test.md`. Core Assistant without `agentsSpec` recommends Deep Research but does not forward to it, which matches S1.
