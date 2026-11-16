import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const LOADER = fileURLToPath(new URL('./swc-register.js', import.meta.url));
const FIXTURES = fs.mkdtempSync(path.join(os.tmpdir(), 'swc-register-'));

// The enums make Node's own type stripping fail, so these only load if the loader compiles them.
fs.writeFileSync(
  path.join(FIXTURES, 'service.ts'),
  `const paramTypes = new Map<unknown, unknown>();
(Reflect as any).metadata = (key: string, value: unknown) => (target: unknown) => {
  if (key === 'design:paramtypes') paramTypes.set(target, value);
};

function Injectable(): ClassDecorator {
  return () => {};
}

enum Mode {
  On = 'on',
}

export class Dependency {}

@Injectable()
export class Service {
  constructor(readonly dependency: Dependency) {}
}

export const mode = Mode.On;
export const serviceParamTypes = (paramTypes.get(Service) as Array<{ name: string }>).map((type) => type.name);
`
);
fs.writeFileSync(
  path.join(FIXTURES, 'broken.ts'),
  `enum Mode {
  On = 'on',
}

throw new Error(\`real load error \${Mode.On}\`);
`
);

after(() => fs.rmSync(FIXTURES, { recursive: true, force: true }));

function runWithLoader(script) {
  const result = spawnSync(process.execPath, ['--require', LOADER, '--input-type=commonjs', '--eval', script], {
    cwd: FIXTURES,
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: '' },
  });
  assert.equal(result.status, 0, result.stderr);

  return result.stdout.trim();
}

test('import() compiles with decorator metadata, as when Mocha retries a spec with import()', () => {
  const output = runWithLoader(
    `import('./service').then(({ default: m }) => console.log(m.mode, JSON.stringify(m.serviceParamTypes)));`
  );

  assert.equal(output, 'on ["Dependency"]');
});

test('import() of a spec that throws while loading reports its own error', () => {
  const output = runWithLoader(`import('./broken.ts').catch((error) => console.log(error.message));`);

  assert.equal(output, 'real load error on');
});

test('require() and require.resolve() find extensionless .ts paths', () => {
  const output = runWithLoader(
    `console.log(require('node:path').basename(require.resolve('./service')), require('./service').serviceParamTypes[0]);`
  );

  assert.equal(output, 'service.ts Dependency');
});
