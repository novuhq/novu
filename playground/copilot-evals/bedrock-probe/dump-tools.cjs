#!/usr/bin/env node
/*
 * Writes probe-tools.json: the Copilot's MCP-path workflow tools exactly as the model receives them
 * (Responses API format, strict: true), keyed by tool name, plus `editStepContent[<stepType>]` for
 * the per-step-type variants the router picks when a step is focused.
 *
 * No network: the tools are built with a stub MCP session and only converted, never called.
 * Needs the built enterprise ee-ai package (`pnpm build` with the enterprise submodule).
 *
 *   NODE_ENV=test NEW_RELIC_ENABLED=false node dump-tools.cjs
 */
const { createRequire } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '../../..');
const EE_AI = path.join(REPO, 'enterprise/packages/ai');
const req = createRequire(path.join(EE_AI, 'package.json'));

const { createMcpWorkflowGenerationTools } = req(path.join(EE_AI, 'dist/ai/mcp/mcp-workflow-tools.adapter.js'));
const { DraftWorkflowState } = req(path.join(EE_AI, 'dist/ai/tools/workflow-generation.tools.js'));
const { ChatOpenAI } = req('@langchain/openai');

const noop = () => {};
const bundle = createMcpWorkflowGenerationTools({
  user: {
    _id: '6650a0000000000000000001',
    organizationId: '6650a0000000000000000002',
    environmentId: '6650a0000000000000000003',
    roles: [],
    permissions: [],
  },
  draftState: new DraftWorkflowState(),
  logger: { info: noop, warn: noop, error: noop, debug: noop },
  session: {
    callTool: async () => {
      throw new Error('dump-tools never calls a tool');
    },
    close: async () => {},
  },
});

// The same conversion the agent's ChatOpenAI applies with StrictToolCallingMiddleware.
const model = new ChatOpenAI({ model: 'gpt-5.4', apiKey: 'sk-dump-only', useResponsesApi: true, streaming: true });
const toWire = (tool) => {
  const converted = model._convertChatOpenAIToolToCompletionsTool(tool, { strict: true });

  return model.invocationParams({ tools: [converted], strict: true }).tools[0];
};

const out = {};
for (const tool of bundle.tools) out[tool.name] = toWire(tool);
for (const [stepType, tool] of Object.entries(bundle.editByStepType)) out[`editStepContent[${stepType}]`] = toWire(tool);

const file = path.join(__dirname, 'probe-tools.json');
fs.writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${Object.keys(out).length} tools (${fs.statSync(file).size} bytes) to ${file}`);
