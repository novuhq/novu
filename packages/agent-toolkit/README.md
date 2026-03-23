# @novu/agent-toolkit

Expose [Novu](https://novu.co) notification workflows as tools for LLM agents. Works with **OpenAI**, **LangChain**, and **Vercel AI SDK**.

The toolkit automatically discovers your Novu workflows and converts them into strongly-typed tools that an LLM can invoke, letting your AI agent send notifications, manage subscriber preferences, and trigger any workflow you've built in Novu.

## Installation

```bash
npm install @novu/agent-toolkit
```

Install the peer dependency for the framework you use:

| Framework | Peer dependency | Import path |
|---|---|---|
| OpenAI | `openai >= 4.0.0` | `@novu/agent-toolkit/openai` |
| LangChain | `@langchain/core >= 0.2.0` | `@novu/agent-toolkit/langchain` |
| Vercel AI SDK | `ai >= 6.0.0` | `@novu/agent-toolkit/ai-sdk` |

## Quick Start

```typescript
import { createNovuAgentToolkit } from '@novu/agent-toolkit/openai';
import OpenAI from 'openai';

const openai = new OpenAI();

const toolkit = await createNovuAgentToolkit({
  secretKey: process.env.NOVU_SECRET_KEY,
  subscriberId: 'user-123',
});

const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Send a welcome email to user-123' }],
  tools: toolkit.tools,
});

// Handle tool calls
for (const toolCall of response.choices[0].message.tool_calls ?? []) {
  const result = await toolkit.handleToolCall(toolCall);
  console.log(result);
}
```

## Configuration

Every adapter's `createNovuAgentToolkit` accepts a `NovuToolkitConfig` object:

```typescript
type NovuToolkitConfig = {
  secretKey: string;
  subscriberId: string;
  backendUrl?: string;
  workflows?: {
    tags?: string[];
    workflowIds?: string[];
  };
};
```

| Option | Required | Description |
|---|---|---|
| `secretKey` | Yes | Your Novu API secret key. |
| `subscriberId` | Yes | Default subscriber ID used when triggering workflows. |
| `backendUrl` | No | Custom Novu API URL (defaults to Novu Cloud). |
| `workflows.tags` | No | Filter discovered workflows by tags. |
| `workflows.workflowIds` | No | Restrict discovered workflows to specific IDs. |

## Framework Adapters

Each adapter exposes a `createNovuAgentToolkit` function that returns tools in the native format for that framework.

### OpenAI

```typescript
import { createNovuAgentToolkit } from '@novu/agent-toolkit/openai';

const toolkit = await createNovuAgentToolkit({
  secretKey: process.env.NOVU_SECRET_KEY,
  subscriberId: 'user-123',
});

// toolkit.tools          — OpenAI function tool definitions
// toolkit.handleToolCall — execute a tool call and return a tool message
```

The returned `toolkit` provides:

- **`tools`** — Array of OpenAI-compatible function tool definitions.
- **`handleToolCall(toolCall)`** — Executes a tool call and returns a `{ role: 'tool', tool_call_id, content }` message ready to append to the conversation.

### LangChain

```typescript
import { createNovuAgentToolkit } from '@novu/agent-toolkit/langchain';

const toolkit = await createNovuAgentToolkit({
  secretKey: process.env.NOVU_SECRET_KEY,
  subscriberId: 'user-123',
});

// toolkit.tools — DynamicStructuredTool[] ready for use with LangChain agents
```

The returned `toolkit` provides:

- **`tools`** — Array of `DynamicStructuredTool` instances that can be passed directly to LangChain agents or executors.

### Vercel AI SDK

```typescript
import { createNovuAgentToolkit } from '@novu/agent-toolkit/ai-sdk';

const toolkit = await createNovuAgentToolkit({
  secretKey: process.env.NOVU_SECRET_KEY,
  subscriberId: 'user-123',
});

// toolkit.tools — ToolSet compatible with generateText / streamText
```

The returned `toolkit` provides:

- **`tools`** — A `ToolSet` object that can be passed to `generateText`, `streamText`, or other Vercel AI SDK functions.

## Built-in Tools

The toolkit ships with two built-in tools that are always available:

### `trigger_workflow`

Triggers any Novu workflow by its identifier. Use this as a generic entry point to send notifications.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `workflowId` | `string` | Yes | The workflow identifier to trigger. |
| `payload` | `Record<string, unknown>` | No | Data passed to the workflow for rendering. |
| `overrides` | `Record<string, unknown>` | No | Provider-specific configuration overrides. |
| `subscriberId` | `string` | No | Target subscriber (defaults to configured `subscriberId`). |
| `transactionId` | `string` | No | Unique key for deduplication. |

### `update_preferences`

Updates notification channel preferences for a subscriber, either globally or for a specific workflow.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `workflowId` | `string` | No | Scope to a specific workflow. Omit for global preferences. |
| `channels` | `object` | No | Channel toggles: `email`, `sms`, `push`, `inApp`, `chat`. |
| `subscriberId` | `string` | No | Target subscriber (defaults to configured `subscriberId`). |

## Dynamic Workflow Tools

On initialization the toolkit fetches your Novu workflows and creates a dedicated tool for each one. These tools are named `trigger_<workflow_id>` (with hyphens replaced by underscores) and include the workflow's payload schema so the LLM knows exactly what data to provide.

Filter which workflows are exposed using the `workflows` config option:

```typescript
const toolkit = await createNovuAgentToolkit({
  secretKey: process.env.NOVU_SECRET_KEY,
  subscriberId: 'user-123',
  workflows: {
    tags: ['ai-agent'],
    workflowIds: ['welcome-email', 'order-confirmation'],
  },
});
```
