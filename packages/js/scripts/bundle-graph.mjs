import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');
const require = createRequire(path.join(packageDir, 'package.json'));
const esbuild = require(require.resolve('esbuild', { paths: [require.resolve('tsup/package.json')] }));

const fixtures = {
  'inbox-only': {
    mustNotContain: ['isAgentEventEnvelope', 'parseAgentEventEnvelope', 'AgentConversationRuntime', 'applyEnvelope'],
    mustContain: ['Notifications', 'createSocket'],
  },
  'web-only': {
    mustNotContain: [],
    mustContain: ['WebChat', 'isAgentEventEnvelope'],
  },
  combined: {
    mustNotContain: [],
    mustContain: ['Notifications', 'WebChat', 'createSocket'],
  },
};

async function bundleFixture(name) {
  const result = await esbuild.build({
    absWorkingDir: packageDir,
    entryPoints: [`bundle-fixtures/${name}.ts`],
    bundle: true,
    splitting: true,
    write: false,
    outdir: 'bundle-graph-output',
    entryNames: name,
    chunkNames: `${name}-chunk-[hash]`,
    format: 'esm',
    platform: 'browser',
    logLevel: 'silent',
    metafile: true,
  });

  const outputCode = new Map(result.outputFiles.map((file) => [path.resolve(file.path), file.text]));
  const outputMetadata = new Map(
    Object.entries(result.metafile.outputs).map(([outputPath, metadata]) => [
      path.resolve(packageDir, outputPath),
      metadata,
    ])
  );
  const entryPath = [...outputMetadata].find(([, metadata]) => metadata.entryPoint)?.[0];

  if (!entryPath) {
    throw new Error(`@novu/js bundle-graph "${name}" did not produce an entry output`);
  }

  const resolveImport = (importerPath, importPath) => {
    const candidates = [
      path.resolve(path.dirname(importerPath), importPath),
      path.resolve(packageDir, importPath),
      path.resolve(importPath),
    ];

    return candidates.find((candidate) => outputMetadata.has(candidate));
  };

  const initialPaths = new Set();
  const pendingPaths = [entryPath];

  while (pendingPaths.length > 0) {
    const outputPath = pendingPaths.pop();
    if (!outputPath || initialPaths.has(outputPath)) {
      continue;
    }

    initialPaths.add(outputPath);
    const metadata = outputMetadata.get(outputPath);
    for (const outputImport of metadata?.imports ?? []) {
      if (outputImport.external || outputImport.kind === 'dynamic-import') {
        continue;
      }

      const importedOutputPath = resolveImport(outputPath, outputImport.path);
      if (!importedOutputPath) {
        throw new Error(
          `@novu/js bundle-graph "${name}" could not resolve static output import "${outputImport.path}"`
        );
      }

      pendingPaths.push(importedOutputPath);
    }
  }

  return {
    initialCode: [...initialPaths].map((outputPath) => outputCode.get(outputPath) ?? '').join('\n'),
    allCode: [...outputCode.values()].join('\n'),
  };
}

function assertBundle(name, bundle, rules) {
  const failures = [];
  const { initialCode, allCode } = bundle;
  const isInboxOnly = name === 'inbox-only';
  const mustNotContainScope = isInboxOnly ? initialCode : allCode;
  const mustContainScope = isInboxOnly ? initialCode : allCode;

  for (const token of rules.mustNotContain) {
    if (mustNotContainScope.includes(token)) {
      failures.push(`must NOT contain "${token}"`);
    }
  }

  for (const token of rules.mustContain) {
    if (!mustContainScope.includes(token)) {
      failures.push(`must contain "${token}"`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`@novu/js bundle-graph "${name}" failed:\n  - ${failures.join('\n  - ')}`);
  }

  console.log(`@novu/js bundle-graph "${name}" passed`);
}

async function main() {
  for (const [name, rules] of Object.entries(fixtures)) {
    const bundle = await bundleFixture(name);
    assertBundle(name, bundle, rules);
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
