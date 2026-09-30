// Register (or update) each persona as a shared A2A agent in the Gemini Enterprise engine, matched by
// display name. Prints the agentsJson entries for ../agents.json. Uses ADC. Usage: node register.ts
import { execFileSync } from 'node:child_process';
import { agentCardFor, PERSONAS } from './personas.ts';

const PROJECT = 'gemini-enterprise-test-509310';
const PROJECT_NUMBER = '398896934586';
const ENGINE = `projects/${PROJECT_NUMBER}/locations/global/collections/default_collection/engines/gemini-enterprise-17899859_1789985955771`;
const AGENTS_API = `https://discoveryengine.googleapis.com/v1alpha/${ENGINE}/assistants/default_assistant/agents`;

const token = execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], { encoding: 'utf8' }).trim();

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'x-goog-user-project': PROJECT, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json()) as T & { error?: { message: string } };
  if (!res.ok) throw new Error(`${method} ${url}: ${res.status} ${json.error?.message}`);

  return json;
}

type RegisteredAgent = { name: string; displayName: string; state?: string };
const { agents = [] } = await call<{ agents?: RegisteredAgent[] }>('GET', AGENTS_API);
const entries = [];

for (const persona of Object.values(PERSONAS)) {
  const url = `https://a2a-${persona.id.replace(/_/g, '-')}-${PROJECT_NUMBER}.us-central1.run.app`;
  const body = {
    displayName: persona.name,
    description: persona.description,
    a2aAgentDefinition: { jsonAgentCard: JSON.stringify(agentCardFor(persona, url)) },
  };
  const existing = agents.find((agent) => agent.displayName === persona.name);
  const agent = existing
    ? await call<RegisteredAgent>(
        'PATCH',
        `https://discoveryengine.googleapis.com/v1alpha/${existing.name}?updateMask=description,a2aAgentDefinition`,
        body
      )
    : await call<RegisteredAgent>('POST', AGENTS_API, body);
  const shared = await call<RegisteredAgent & { sharingConfig?: { scope?: string } }>(
    'PATCH',
    `https://discoveryengine.googleapis.com/v1alpha/${agent.name}?updateMask=sharingConfig`,
    { sharingConfig: { scope: 'ALL_USERS' } }
  );
  const targetId = agent.name.split('/').at(-1);
  console.error(`${existing ? 'updated' : 'created'} ${persona.name}: ${targetId} ${shared.state} ${shared.sharingConfig?.scope}`);
  entries.push({ id: persona.id, name: persona.name, description: persona.description, path: 'a2a_proxy', targetId });
}

console.log(JSON.stringify(entries, null, 2));
