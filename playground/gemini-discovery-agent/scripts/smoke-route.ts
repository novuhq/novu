// Real routing check: the live classifier (Jev if JEV_API_KEY is set, else Gemini fallback) plus the policy,
// on the demo phrases, and one direct Gemini answer. Writes artifacts/smoke-route.json.
// Usage: node scripts/smoke-route.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadConfig } from '../src/config.ts';
import { classify } from '../src/route/classify.ts';
import { answerDirectly } from '../src/route/gemini.ts';
import { decideFromScores, readRouteState, type Decision } from '../src/route/policy.ts';

const config = loadConfig();
const agentIds = config.agents.map((a) => a.id);

const cases: Array<{ text: string; expect: string; ok: (d: Decision) => boolean }> = [
  { text: 'Research how the EU AI Act affects HR tools.', expect: 'forward deep_research', ok: (d) => d.action === 'forward' && d.agentId === 'deep_research' },
  { text: 'What were our sales?', expect: 'forward sales', ok: (d) => d.action === 'forward' && d.agentId === 'sales' },
  { text: 'Summarise last quarter.', expect: 'choose card', ok: (d) => d.action === 'choose' },
  { text: 'hi, what can you do?', expect: 'direct', ok: (d) => d.action === 'direct' },
];

const results = [];
for (const c of cases) {
  const started = Date.now();
  const { scores, jevError } = await classify(config, { text: c.text, current: undefined, history: [], agents: config.agents });
  const decision = decideFromScores(readRouteState(undefined), scores, agentIds);
  const pass = c.ok(decision);
  results.push({ text: c.text, expect: c.expect, scores, jevError, decision, pass, ms: Date.now() - started });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${c.text} -> ${JSON.stringify(decision)} ${JSON.stringify(scores)} (${Date.now() - started} ms)`);
}

// Follow-up routing with context: after a Deep Research plan, "Start Research" should stay with Deep Research.
const followUp = await classify(config, {
  text: 'Start Research',
  current: config.agents.find((a) => a.id === 'deep_research'),
  history: ['User: Research how the EU AI Act affects HR tools.', "Last agent reply: Deep Research: Here's a research plan… Reply Start Research to run it."],
  agents: config.agents,
});
const followUpDecision = decideFromScores(readRouteState({ current: 'deep_research' }), followUp.scores, agentIds);
const followUpPass = followUpDecision.action === 'forward' && followUpDecision.agentId === 'deep_research';
console.log(`[${followUpPass ? 'PASS' : 'FAIL'}] Start Research (current=deep_research) -> ${JSON.stringify(followUpDecision)}`);

const directStarted = Date.now();
const direct = await answerDirectly(config, 'hi, what can you do?', [], config.agents);
console.log(`direct answer (${Date.now() - directStarted} ms): ${direct.slice(0, 300)}`);

mkdirSync('artifacts', { recursive: true });
writeFileSync(
  'artifacts/smoke-route.json',
  `${JSON.stringify(
    {
      ranAt: new Date().toISOString(),
      classifier: config.jevApiKey ? 'jev (gemini fallback on error)' : `gemini fallback (${config.classifierModel}); JEV_API_KEY not set`,
      directModel: config.geminiModel,
      results,
      followUp: { text: 'Start Research', current: 'deep_research', ...followUp, decision: followUpDecision, pass: followUpPass },
      directAnswer: { text: 'hi, what can you do?', answer: direct, ms: Date.now() - directStarted },
    },
    null,
    2
  )}\n`
);
console.log('wrote artifacts/smoke-route.json');
process.exitCode = results.every((r) => r.pass) && followUpPass ? 0 : 1;
