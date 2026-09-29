// Real-sandbox forwarding check with ADC. Writes artifacts/smoke-forward.json.
// Usage: node scripts/smoke-forward.ts [--deep-research]
//   --deep-research adds ONE Deep Research plan-only turn (uses Deep Research quota; never sends "Start Research").
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { loadConfig } from '../src/config.ts';
import { forward, type ForwardResult } from '../src/forward/index.ts';
import { parseStream } from '../src/forward/stream-assist.ts';
import { type Exchange, setExchangeRecorder } from '../src/google-auth.ts';

const { values } = parseArgs({ options: { 'deep-research': { type: 'boolean', default: false } } });
const config = loadConfig();
const exchanges: Exchange[] = [];
setExchangeRecorder((exchange) => exchanges.push(exchange));

type Step = { name: string; agent: string; text: string; sessionIn?: string; ms: number; result?: ForwardResult; error?: string; check: string; pass: boolean; exchange?: unknown };
const steps: Step[] = [];

async function step(name: string, agentId: string, text: string, session: string | undefined, check: (r: ForwardResult) => boolean, checkLabel: string) {
  const target = config.agents.find((a) => a.id === agentId);
  if (!target) throw new Error(`agent ${agentId} not in agents file`);
  const before = exchanges.length;
  const started = Date.now();
  let result: ForwardResult | undefined;
  let error: string | undefined;
  try {
    result = await forward(config, target, text, session);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  const raw = exchanges.slice(before).map((e) => ({ ...e, response: safeParse(e.url, e.responseText), responseText: undefined }));
  const s: Step = { name, agent: agentId, text, sessionIn: session, ms: Date.now() - started, result, error, check: checkLabel, pass: !!result && check(result), exchange: raw };
  steps.push(s);
  console.log(`[${s.pass ? 'PASS' : 'FAIL'}] ${name} (${s.ms} ms): ${JSON.stringify(result ?? error).slice(0, 300)}`);

  return result;
}

const t1 = await step('a2a-t1', 'sales', 'What were sales?', undefined, (r) => r.kind === 'question' && r.text === 'Which month?', 'kind=question, text="Which month?"');
if (t1) {
  await step('a2a-t2', 'sales', 'March', t1.session, (r) => r.kind === 'answer' && r.text.includes('March') && r.session === t1.session, 'kind=answer mentioning March, same session');
}
if (values['deep-research']) {
  await step('deep-research-plan', 'deep_research', 'Research how the EU AI Act affects HR tools.', undefined, (r) => r.kind === 'answer' && /research plan/i.test(r.text), 'kind=answer containing a research plan');
}

mkdirSync('artifacts', { recursive: true });
const file = values['deep-research'] ? 'artifacts/smoke-forward-deep-research.json' : 'artifacts/smoke-forward.json';
const redact = (key: string, value: unknown) => (/token/i.test(key) && typeof value === 'string' ? '<redacted>' : value);
writeFileSync(file, `${JSON.stringify({ ranAt: new Date().toISOString(), auth: 'ADC (Authorization header not recorded)', steps }, redact, 2)}\n`);
console.log(`wrote ${file}`);
process.exitCode = steps.every((s) => s.pass) ? 0 : 1;

function safeParse(url: string, text: string): unknown {
  try {
    return url.includes('alt=sse') ? parseStream(text) : JSON.parse(text);
  } catch {
    return text.length > 200_000 ? `${text.slice(0, 200_000)}…` : text;
  }
}
