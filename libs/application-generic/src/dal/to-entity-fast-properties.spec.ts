import { spawnSync } from 'node:child_process';
import { expect } from 'chai';

/**
 * `toEntity` / `toJsonPlain` must keep their objects in V8 fast (hidden-class) mode wherever
 * `JSON.parse` did. Assigning computed keys (`out[key] = value`) puts an object in dictionary
 * mode after about 17 fields, which made 20+ field entities (subscriber, integration,
 * organization, ...) several times larger and slower to read.
 *
 * `%HasFastProperties` needs `--allow-natives-syntax`, so the check runs in a child process
 * that loads the built `@novu/dal` and maps BSON-decoded documents, as `.lean()` returns them.
 */
const CHECK_SCRIPT = `
const dal = require(process.argv[1]);
const { BSON, ObjectId } = dal.Agent.base.mongo;
class Entity {}
const fast = (o) => %HasFastProperties(o);

function doc(fieldCount) {
  const d = { _id: new ObjectId(), _environmentId: new ObjectId(), _organizationId: new ObjectId(), createdAt: new Date() };
  for (let i = 0; Object.keys(d).length < fieldCount; i++) d['field' + i] = i % 2 ? 'value-' + i : i;
  return d;
}

const results = {};
for (const fieldCount of [20, 24, 28, 40, 64, 127, 128, 150]) {
  // fieldCount keys at every level: the root's include \`nested\` and \`list\`.
  const bytes = BSON.serialize({ ...doc(fieldCount - 2), nested: doc(fieldCount), list: [doc(fieldCount)] });
  // Many documents of one shape, like a busy repository.
  const entities = Array.from({ length: 200 }, () => dal.toEntity(Entity, BSON.deserialize(bytes)));
  const last = entities[entities.length - 1];
  const plain = dal.toJsonPlain(BSON.deserialize(bytes));
  const json = JSON.parse(JSON.stringify(BSON.deserialize(bytes)));
  results[fieldCount] = {
    json: fast(json) && fast(json.nested),
    entity: fast(entities[0]) && fast(last),
    isEntity: last instanceof Entity,
    nested: fast(last.nested) && fast(last.list[0]),
    plain: fast(plain) && fast(plain.nested),
  };
}
process.stdout.write(JSON.stringify(results));
`;

type Result = { json: boolean; entity: boolean; isEntity: boolean; nested: boolean; plain: boolean };

function runCheck(): Record<string, Result> {
  const child = spawnSync(
    process.execPath,
    ['--allow-natives-syntax', '-e', CHECK_SCRIPT, require.resolve('@novu/dal')],
    { encoding: 'utf8' }
  );
  if (child.status !== 0) {
    throw new Error(`fast-properties check failed: ${child.stderr}`);
  }

  return JSON.parse(child.stdout);
}

describe('toEntity V8 property mode', () => {
  let results: Record<string, Result>;

  beforeAll(() => {
    results = runCheck();
  });

  for (const fieldCount of ['20', '24', '28', '40', '64', '127']) {
    it(`keeps ${fieldCount}-field entities, nested objects and plain copies in fast mode`, () => {
      expect(results[fieldCount]).to.deep.equal({
        json: true,
        entity: true,
        isEntity: true,
        nested: true,
        plain: true,
      });
    });
  }

  for (const fieldCount of ['128', '150']) {
    it(`maps ${fieldCount}-key entities like JSON.parse, in dictionary mode`, () => {
      // From 128 keys JSON.parse uses dictionary mode too, and the walk falls back to plain assignment.
      expect(results[fieldCount]).to.include({ json: false, entity: false, isEntity: true });
    });
  }
});
