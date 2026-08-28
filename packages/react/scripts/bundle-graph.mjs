import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');
const require = createRequire(path.join(packageDir, 'package.json'));
const esbuild = require(require.resolve('esbuild', { paths: [require.resolve('tsup/package.json')] }));

const externalNovu = ['@novu/js', '@novu/js/ui', '@novu/js/internal'];

const fixtures = {
  'inbox-only': {
    mustNotContain: ['solid-js', 'useAgentChat', 'loadAgentChat'],
    mustContain: ['NovuUI', 'Inbox'],
  },
  'agent-only': {
    mustNotContain: ['solid-js', 'NovuUI', 'DefaultInbox'],
    mustContain: ['useAgentChat', 'loadAgentChat'],
  },
  combined: {
    mustNotContain: [],
    mustContain: ['NovuUI', 'Inbox', 'useAgentChat', 'loadAgentChat'],
  },
};

async function bundleFixture(name, externalizeNovuJs) {
  const result = await esbuild.build({
    entryPoints: [path.join(packageDir, 'bundle-fixtures', `${name}.tsx`)],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    jsx: 'automatic',
    logLevel: 'silent',
    external: externalizeNovuJs
      ? ['react', 'react-dom', 'react/jsx-runtime', ...externalNovu]
      : ['react', 'react-dom', 'react/jsx-runtime'],
  });

  return result.outputFiles[0].text;
}

function assertBundle(label, code, rules) {
  const failures = [];

  for (const token of rules.mustNotContain) {
    if (code.includes(token)) {
      failures.push(`must NOT contain "${token}"`);
    }
  }

  for (const token of rules.mustContain) {
    if (!code.includes(token)) {
      failures.push(`must contain "${token}"`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`@novu/react bundle-graph ${label} failed:\n  - ${failures.join('\n  - ')}`);
  }

  console.log(`@novu/react bundle-graph ${label} passed`);
}

async function main() {
  for (const [name, rules] of Object.entries(fixtures)) {
    const reactGraphCode = await bundleFixture(name, true);
    assertBundle(`"${name}" (react graph)`, reactGraphCode, rules);
  }

  const agentIntegrationCode = await bundleFixture('agent-only', false);
  assertBundle('"agent-only" (integration)', agentIntegrationCode, fixtures['agent-only']);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
