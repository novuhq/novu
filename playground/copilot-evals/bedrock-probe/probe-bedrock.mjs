#!/usr/bin/env node
/*
 * Bedrock probe: do Bedrock's structured-output limits (<=16 union-typed properties, <=12 optional properties,
 * ~90 s first compile, 24 h grammar cache) apply to strict function tools on OpenAI models via the
 * OpenAI-compatible Responses API, per tool or per request, streamed or not?
 *
 * Dry run by default: prints the plan and request sizes, sends nothing.
 *
 *   node probe-bedrock.mjs                      # dry run (no network)
 *   AWS_BEARER_TOKEN_BEDROCK=... \
 *   BEDROCK_OPENAI_BASE_URL=https://bedrock-runtime.us-east-1.amazonaws.com/openai/v1 \
 *   BEDROCK_MODEL=global.openai.gpt-6-luna \
 *   node probe-bedrock.mjs --send [--only A,B] [--no-stream-variants]
 *
 * Mantle instead: BEDROCK_OPENAI_BASE_URL=https://bedrock-mantle.us-east-1.api.aws/openai/v1 BEDROCK_MODEL=openai.gpt-6-luna
 * Output: probe-results-<timestamp>.jsonl next to this file (one line per request) + a summary table.
 * Tool definitions: probe-tools.json = the Copilot's MCP-path tools exactly as LangChain sends them
 * (Responses format, strict: true). Generate it first with dump-tools.cjs.
 * Cost: 45 small requests, mostly forced tool calls on SMS-sized content; max_output_tokens 2048.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const SEND = argv.includes('--send');
const ONLY = argv.includes('--only') ? new Set(argv[argv.indexOf('--only') + 1].split(',')) : undefined;
const STREAM_VARIANTS = !argv.includes('--no-stream-variants');
const BASE_URL = (process.env.BEDROCK_OPENAI_BASE_URL ?? 'https://bedrock-runtime.us-east-1.amazonaws.com/openai/v1').replace(/\/$/, '');
const MODEL = process.env.BEDROCK_MODEL ?? 'global.openai.gpt-6-luna';
const KEY = process.env.AWS_BEARER_TOKEN_BEDROCK ?? process.env.BEDROCK_API_KEY;
const TIMEOUT_MS = Number(process.env.PROBE_TIMEOUT_MS ?? 180_000); // > Bedrock's ~90 s first compile
const MAX_OUTPUT_TOKENS = 2048;

const TOOLS = JSON.parse(fs.readFileSync(path.join(here, 'probe-tools.json'), 'utf8'));
const tool = (key, overrides = {}) => {
  if (!TOOLS[key]) throw new Error(`unknown tool ${key}`);
  return { ...structuredClone(TOOLS[key]), ...overrides };
};
const nonStrict = (key) => tool(key, { strict: false });
const withoutSchemaKeyword = (t) => {
  const { $schema: _drop, ...parameters } = t.parameters;
  return { ...t, parameters };
};
const uniq = () => Math.random().toString(36).slice(2, 8); // defeats grammar cache for "first compile" tests

// ---------- synthetic boundary schemas ----------
/** n required properties, each nullable via a type array (Bedrock: "union-typed"). */
function nullableProps(n, { form = 'typeArray', salt = '' } = {}) {
  const properties = {};
  for (let i = 1; i <= n; i++) {
    properties[`p${i}${salt}`] =
      form === 'typeArray' ? { type: ['string', 'null'] } : { anyOf: [{ type: 'string' }, { type: 'null' }] };
  }
  return fnTool(`nullable_${n}_${form}`, properties, Object.keys(properties));
}
/** n properties left out of `required` (Bedrock: "optional"); OpenAI strict mode refuses any. */
function optionalProps(n) {
  const properties = { id: { type: 'string' } };
  for (let i = 1; i <= n; i++) properties[`o${i}`] = { type: 'string' };
  return fnTool(`optional_${n}`, properties, ['id']);
}
/** n array properties whose ITEMS are unions: union nodes that are not union-typed properties. */
function unionItems(n) {
  const properties = {};
  for (let i = 1; i <= n; i++) properties[`a${i}`] = { type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'number' }] } };
  return fnTool(`union_items_${n}`, properties, Object.keys(properties));
}
function fnTool(name, properties, required) {
  return {
    type: 'function',
    name,
    description: `Probe tool ${name}. Fill every field with a short value or null.`,
    parameters: { type: 'object', properties, required, additionalProperties: false },
    strict: true,
  };
}

// ---------- test matrix ----------
const SMS_ADD = 'Call addStep to add an SMS step with stepId "sms-1", name "SMS Step", body "Your order shipped", and no skip condition.';
const T = [];
const add = (id, question, tools, { prompt, toolChoice, stream = false, expectCache = false } = {}) =>
  T.push({ id, question, tools, prompt, toolChoice, stream, expectCache });
const force = (name) => ({ type: 'function', name });

// A. Baseline and validator fingerprint
add('A1', 'strict works at all (tiny tool)', [tool('removeStep')], { prompt: 'Remove step "sms-1" because it is unused.', toolChoice: force('removeStep') });
add('A2', 'draft-07 "$schema" keyword accepted? (LangChain sends it on every tool)', [withoutSchemaKeyword(tool('removeStep'))], { prompt: 'Remove step "sms-1" because it is unused.', toolChoice: force('removeStep') });
add('A3', 'which validator runs: 1 optional property under strict (OpenAI refuses, Bedrock allows <=12)', [optionalProps(1)], { toolChoice: force('optional_1') });

// B. Bedrock union limit, per schema
add('B1', '16 nullable (type array) properties: at the limit', [nullableProps(16)], { toolChoice: force('nullable_16_typeArray') });
add('B2', '17 nullable (type array) properties: over the limit -> immediate ValidationException if enforced', [nullableProps(17)], { toolChoice: force('nullable_17_typeArray') });
add('B3', '17 nullable (anyOf) properties', [nullableProps(17, { form: 'anyOf' })], { toolChoice: force('nullable_17_anyOf') });
add('B4', 'do unions inside array items count? 17 arrays of anyOf items, 0 union properties', [unionItems(17)], { toolChoice: force('union_items_17') });

// C. Bedrock optional limit (only meaningful if A3 was accepted)
add('C1', '12 optional properties: at the limit', [optionalProps(12)], { toolChoice: force('optional_12') });
add('C2', '13 optional properties: over -> "Schema is too complex" after up to ~90 s if enforced', [optionalProps(13)], { toolChoice: force('optional_13') });

// D. Per tool vs per request: two tools of 10 unions each (20 in the request)
{
  const a = nullableProps(10, { salt: 'a' }); a.name = 'nullable_10_a';
  const b = nullableProps(10, { salt: 'b' }); b.name = 'nullable_10_b';
  add('D1', 'two strict tools x10 unions (sum 20): passes => limit is per tool; 400 => per request', [a, b], { toolChoice: force('nullable_10_a') });
}

// E. Real Copilot tools, one per request (per-tool verdict)
const SMALL = ['reasoning', 'setWorkflowMetadata', 'updatePayloadSchema', 'updateStepConditions', 'moveStep',
  'editStepContent[sms]', 'editStepContent[in_app]', 'editStepContent[digest]', 'editStepContent[throttle]', 'editStepContent[http_request]', 'editStepContent[delay]'];
const PROMPTS = {
  reasoning: 'Call reasoning with label "plan" and a one-line thought.',
  setWorkflowMetadata: 'Call setWorkflowMetadata to name the workflow "Order shipped" with tag "orders" and a payload property orderId (string).',
  updatePayloadSchema: 'Call updatePayloadSchema to add a string payload property "orderId".',
  updateStepConditions: 'Call updateStepConditions on step "sms-1" so it only runs when payload.priority == "high".',
  moveStep: 'Call moveStep to move step "sms-1" to index 0.',
  'editStepContent[sms]': 'Call editStepContent to set SMS step "sms-1" body to "Your order shipped".',
  'editStepContent[in_app]': 'Call editStepContent to set in-app step "inbox-1" subject "Shipped" and body "Your order shipped".',
  'editStepContent[digest]': 'Call editStepContent to make digest step "digest-1" a regular 1 hour digest.',
  'editStepContent[throttle]': 'Call editStepContent to make throttle step "throttle-1" fixed: 5 per 1 hour.',
  'editStepContent[http_request]': 'Call editStepContent to make http step "http-1" POST https://example.com/hook with no headers or body.',
  'editStepContent[delay]': 'Call editStepContent to make delay step "delay-1" wait 10 minutes.',
  addStep: SMS_ADD,
  addStepInBetween: 'Call addStepInBetween to add an SMS step "sms-2" (name "SMS Step", body "Hi") after step "inbox-1", no skip.',
  editStepContent: 'Call editStepContent to set SMS step "sms-1" body to "Your order shipped".',
  'editStepContent[email]': 'Call editStepContent on email step "email-1" with editorType html, subject "Shipped", body "<p>Your order shipped</p>", and null preheader, from and replyTo.',
};
const toolName = (key) => TOOLS[key].name;
for (const key of SMALL) add(`E:${key}`, `${key} alone, strict (expected to pass if limits are per tool)`, [tool(key)], { prompt: PROMPTS[key], toolChoice: force(toolName(key)) });
for (const key of ['addStep', 'addStepInBetween', 'editStepContent', 'editStepContent[email]']) {
  add(`E:${key}`, `${key} alone, strict (549-579 union props: expected 400 if limits apply)`, [tool(key)], { prompt: PROMPTS[key], toolChoice: force(toolName(key)) });
  add(`F:${key}`, `${key} alone, strict:false (the fallback: accepted? valid args?)`, [nonStrict(key)], { prompt: PROMPTS[key], toolChoice: force(toolName(key)) });
}

// G. Real per-call compositions (DynamicWorkflowToolsMiddleware), strict on every tool, tool_choice auto
const R = 'reasoning', M = 'setWorkflowMetadata', E = 'editStepContent';
const COMPOSITIONS = {
  'G1 create 1st call': [R, M, 'addStep'],
  'G2 edit focused sms': [R, M, `${E}[sms]`],
  'G3 edit focused in_app (sum 19 unions)': [R, M, `${E}[in_app]`],
  'G4 edit unfocused': [R, M, E],
  'G5 router fails, all 9 tools': [R, M, E, 'addStep', 'updateStepConditions', 'removeStep', 'moveStep', 'updatePayloadSchema', 'addStepInBetween'],
};
for (const [id, keys] of Object.entries(COMPOSITIONS)) {
  add(id, `real composition: ${keys.join(', ')}`, keys.map((k) => tool(k)), { prompt: SMS_ADD });
}
// G6: the smallest change set: heavy tools non-strict, small tools strict, in one request
add('G6 mixed strict (proposed fix)', 'create 1st call with addStep strict:false and the rest strict', [tool(R), tool(M), nonStrict('addStep')], { prompt: SMS_ADD });

// H. Compile time and cache: a never-seen schema twice in a row (first compile vs cached)
{
  const fresh = nullableProps(8, { salt: `_${uniq()}` });
  add('H1 first compile', 'fresh schema, first use: records the compile delay (doc: up to ~90 s)', [fresh], { toolChoice: force(fresh.name) });
  add('H2 cached', 'same schema again: should be near normal latency', [structuredClone(fresh)], { toolChoice: force(fresh.name), expectCache: true });
  const reordered = [tool(M), tool(R), tool(`${E}[sms]`)];
  add('H3 reordered tools', 'G2 tools and prompt, tools in another order: is the grammar cache keyed on tool order? (router reorders tools)', reordered, { prompt: SMS_ADD });
}

// I. Streaming variants of the decisive cases
if (STREAM_VARIANTS) {
  for (const t of [...T]) {
    if (['A1', 'B2', 'C2', 'D1', 'E:addStep', 'G1 create 1st call', 'G6 mixed strict (proposed fix)'].includes(t.id)) {
      T.push({ ...t, id: `${t.id} [stream]`, stream: true, tools: structuredClone(t.tools) });
    }
  }
}

// ---------- runner ----------
function body(t) {
  return {
    model: MODEL,
    input: [
      { role: 'system', content: 'You are a test harness. Always answer by calling a tool. Use null for anything not specified.' },
      { role: 'user', content: t.prompt ?? 'Call the tool with short placeholder values.' },
    ],
    tools: t.tools,
    ...(t.toolChoice ? { tool_choice: t.toolChoice } : {}),
    parallel_tool_calls: false,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    reasoning: { effort: 'low' },
    stream: t.stream,
    store: false,
  };
}

function validateArgs(toolDef, argsText) {
  try {
    const args = JSON.parse(argsText);
    const errors = [];
    const check = (schema, value, at) => {
      if (!schema || typeof schema !== 'object') return;
      const types = schema.type ? [].concat(schema.type) : undefined;
      if (schema.anyOf) {
        if (!schema.anyOf.some((option) => { const before = errors.length; check(option, value, at); const ok = errors.length === before; errors.length = before; return ok; })) errors.push(`${at}: no anyOf branch matches`);
        return;
      }
      if (types) {
        const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : Number.isInteger(value) ? 'integer' : typeof value;
        if (!types.includes(actual) && !(actual === 'integer' && types.includes('number'))) { errors.push(`${at}: ${actual} not in ${types}`); return; }
      }
      if (schema.enum && !schema.enum.includes(value)) errors.push(`${at}: ${JSON.stringify(value)} not in enum`);
      if (value && typeof value === 'object' && !Array.isArray(value) && schema.properties) {
        for (const key of schema.required ?? []) if (!(key in value)) errors.push(`${at}.${key}: missing`);
        if (schema.additionalProperties === false) for (const key of Object.keys(value)) if (!(key in schema.properties)) errors.push(`${at}.${key}: extra`);
        for (const [key, sub] of Object.entries(schema.properties)) if (key in value) check(sub, value[key], `${at}.${key}`);
      }
      if (Array.isArray(value) && schema.items) value.forEach((item, i) => check(schema.items, item, `${at}[${i}]`));
    };
    check(toolDef.parameters, args, '$');
    return { parsed: true, schemaValid: errors.length === 0, errors: errors.slice(0, 5) };
  } catch (error) {
    return { parsed: false, schemaValid: false, errors: [String(error.message)] };
  }
}

async function run(t) {
  const payload = body(t);
  const requestBytes = Buffer.byteLength(JSON.stringify(payload));
  const record = { id: t.id, question: t.question, stream: t.stream, model: MODEL, baseUrl: BASE_URL, tools: t.tools.map((x) => `${x.name}${x.strict ? '' : '(non-strict)'}`), requestBytes };
  if (!SEND) return { ...record, dryRun: true };

  const started = performance.now();
  let ttfbMs, firstEventType, status, headers = {}, errorBody, functionCall, usage, eventCount = 0;
  try {
    const response = await fetch(`${BASE_URL}/responses`, {
      method: 'POST',
      headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    ttfbMs = Math.round(performance.now() - started);
    status = response.status;
    for (const name of ['x-amzn-requestid', 'x-amzn-errortype', 'x-request-id', 'openai-processing-ms']) if (response.headers.get(name)) headers[name] = response.headers.get(name);
    if (!response.ok) {
      errorBody = (await response.text()).slice(0, 2000);
    } else if (t.stream) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let args = '';
      let name;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let index;
        while ((index = buffer.indexOf('\n\n')) !== -1) {
          const chunk = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          const data = chunk.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
          if (!data || data === '[DONE]') continue;
          const event = JSON.parse(data);
          eventCount++;
          if (!firstEventType) { firstEventType = event.type; record.firstEventMs = Math.round(performance.now() - started); }
          if (event.type === 'response.output_item.added' && event.item?.type === 'function_call') name = event.item.name;
          if (event.type === 'response.function_call_arguments.delta' && !record.firstArgDeltaMs) record.firstArgDeltaMs = Math.round(performance.now() - started);
          if (event.type === 'response.function_call_arguments.done') args = event.arguments;
          if (['response.completed', 'response.incomplete', 'response.failed'].includes(event.type)) {
            usage = event.response?.usage;
            record.responseStatus = event.response?.status;
            record.incompleteReason = event.response?.incomplete_details?.reason;
          }
          if (event.type === 'error' || event.type === 'response.failed') errorBody = JSON.stringify(event).slice(0, 2000);
        }
      }
      if (name) functionCall = { name, arguments: args };
    } else {
      const json = await response.json();
      usage = json.usage;
      const call = (json.output ?? []).find((item) => item.type === 'function_call');
      if (call) functionCall = { name: call.name, arguments: call.arguments };
      record.responseStatus = json.status;
      record.incompleteReason = json.incomplete_details?.reason;
    }
  } catch (error) {
    errorBody = `${error.name}: ${error.message}`;
  }
  const totalMs = Math.round(performance.now() - started);
  const toolDef = functionCall && t.tools.find((x) => x.name === functionCall.name);
  return {
    ...record, status, ttfbMs, totalMs, firstEventType, eventCount, headers, errorBody,
    functionCall: functionCall ? { name: functionCall.name, argsBytes: functionCall.arguments.length, ...(toolDef ? validateArgs(toolDef, functionCall.arguments) : {}) } : undefined,
    usage,
  };
}

// --only takes exact ids (A1, E:addStep, G1) or group letters (A, B); either also selects the [stream] twin
const plan = T.filter((t) => {
  const shortId = t.id.split(' ')[0];
  return !ONLY || ONLY.has(t.id) || ONLY.has(shortId) || ONLY.has(shortId[0]);
});
if (ONLY && plan.length === 0) {
  console.error(`--only ${[...ONLY].join(',')} matched no request. Nothing was sent.`);
  process.exit(1);
}
if (SEND && !KEY) {
  console.error('Set AWS_BEARER_TOKEN_BEDROCK (Bedrock API key) to send. Nothing was sent.');
  process.exit(1);
}
console.log(`${SEND ? 'SENDING' : 'DRY RUN (add --send to call Bedrock)'}: ${plan.length} requests -> ${BASE_URL}/responses model=${MODEL}`);
const outFile = path.join(here, `probe-results-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`);
const verdictOf = (result) => {
  if (result.status !== 200 || result.errorBody) return `FAIL ${result.status ?? ''} ${String(result.errorBody ?? '').slice(0, 160)}`;
  // e.g. max_output_tokens reached: the args are cut off, so they say nothing about the schema
  if (result.responseStatus !== 'completed') return `UNFINISHED ${result.responseStatus ?? 'no final status'}${result.incompleteReason ? ` (${result.incompleteReason})` : ''}`;
  return result.functionCall?.schemaValid ? 'OK valid-args' : `OK ${result.functionCall ? 'INVALID-args' : 'no-call'}`;
};
const rows = [];
for (const t of plan) {
  const result = await run(t); // sequential on purpose: compile/caching timings must not overlap
  rows.push(result);
  if (SEND) fs.appendFileSync(outFile, `${JSON.stringify(result)}\n`);
  const verdict = SEND ? verdictOf(result) : '';
  console.log(`${t.id.padEnd(44)} ${String(result.requestBytes).padStart(7)} B ${SEND ? `${String(result.totalMs).padStart(6)} ms ttfb ${result.ttfbMs} ` : ''}${verdict}`);
}
if (SEND) console.log(`\nWrote ${outFile}`);
console.log(`
How to read it:
- A3 accepted (200)  => Bedrock's own grammar/validator is in the path (OpenAI strict refuses optional properties).
  A3 400 mentioning "required" => OpenAI-style validation; then B/C tell whether Bedrock limits are layered on top.
- B1 OK + B2/B3 400 "ValidationException" immediately => 16-union limit applies to OpenAI strict tools.
- B4 400 => unions in array items count too (updateStepConditions has 1 union property but 26 union nodes).
- C2 400 "Schema is too complex" (after up to ~90 s) => 12-optional limit applies.
- D1 400 => limits count the whole request (sum across tools); D1 OK + B2 400 => per tool.
- E:* per-tool verdicts on the real Copilot tools; F:* shows the non-strict fallback is accepted and how often args are invalid.
- G1..G5 are the real per-call tool sets; G6 is the proposed fix (heavy tools non-strict, others strict).
- H1 totalMs - H2 totalMs ~ compile cost; H3 much slower than G2 (same prompt, tools reordered) => cache keyed on tool order (sort tools before sending).
- UNFINISHED => the response stopped early (reason in brackets, e.g. max_output_tokens); its args are not a schema verdict.
- "[stream]" rows: same as their non-stream twin => streaming does not change the verdict; firstEventMs shows the compile delay.`);
