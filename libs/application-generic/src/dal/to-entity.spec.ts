import {
  Agent,
  AgentEntity,
  AgentToolTrust,
  AgentToolTrustEntity,
  canSkipClassTransformer,
  IntegrationEntity,
  NotificationTemplateEntity,
  schemaOptions,
  toEntity,
  toJsonPlain,
  UserEntity,
} from '@novu/dal';
import { expect } from 'chai';
import { Exclude, instanceToPlain, plainToInstance, Transform, Type } from 'class-transformer';

/**
 * Parity for `toEntity` / `toJsonPlain` (libs/dal/src/repositories/to-entity.ts) against the
 * mapping they replace: `plainToInstance(Entity, JSON.parse(JSON.stringify(data)))`.
 * Lives here because @novu/dal has no test runner; application-generic runs on every DAL change.
 */

// The DAL's own mongoose instance, so documents are built exactly as repositories see them.
const mongoose = Agent.base;
const { Schema, Types } = mongoose;
// `Integration` and `NotificationTemplate` are ambiguous star exports of @novu/dal; read the registered models.
const Integration = mongoose.models.Integration;
const NotificationTemplate = mongoose.models.NotificationTemplate;

class PlainEntity {}

function legacyMapEntity(entityClass: any, data: unknown) {
  return plainToInstance(entityClass, JSON.parse(JSON.stringify(data)));
}

/**
 * Deep-equal is not enough: it ignores prototypes and key order. Walk both values and
 * compare prototype, key order and leaf values at every level.
 */
function expectSameShape(actual: any, expected: any, path = '$') {
  if (expected === null || typeof expected !== 'object') {
    expect(Object.is(actual, expected), `${path}: ${String(actual)} !== ${String(expected)}`).to.equal(true);

    return;
  }

  expect(typeof actual === 'object' && actual !== null, `${path} is an object`).to.equal(true);
  expect(Object.getPrototypeOf(actual), `${path} prototype`).to.equal(Object.getPrototypeOf(expected));
  expect(Array.isArray(actual), `${path} isArray`).to.equal(Array.isArray(expected));
  expect(Reflect.ownKeys(actual), `${path} keys`).to.deep.equal(Reflect.ownKeys(expected));

  for (const key of Reflect.ownKeys(expected)) {
    const expectedDescriptor = Object.getOwnPropertyDescriptor(expected, key)!;
    const actualDescriptor = Object.getOwnPropertyDescriptor(actual, key)!;
    expect(actualDescriptor.enumerable, `${path}.${String(key)} enumerable`).to.equal(expectedDescriptor.enumerable);
    expectSameShape(actualDescriptor.value, expectedDescriptor.value, `${path}.${String(key)}`);
  }
}

function expectEntityParity(entityClass: any, data: unknown) {
  const expected = legacyMapEntity(entityClass, data);
  const actual = toEntity(entityClass, data);

  expect(actual).to.deep.equal(expected);
  expect(JSON.stringify(actual)).to.equal(JSON.stringify(expected));
  expectSameShape(actual, expected);

  return actual as any;
}

function expectJsonParity(data: unknown) {
  const expected = JSON.parse(JSON.stringify(data));
  const actual = toJsonPlain(data);

  expect(actual).to.deep.equal(expected);
  expect(JSON.stringify(actual)).to.equal(JSON.stringify(expected));
  expectSameShape(actual, expected);
}

function expectBoth(data: unknown, entityClass: any = PlainEntity) {
  expectJsonParity(data);

  return expectEntityParity(entityClass, data);
}

function expectSameError(run: () => unknown, legacy: () => unknown) {
  let expected: unknown;
  try {
    legacy();
  } catch (error) {
    expected = error;
  }
  expect(expected, 'legacy path should throw').to.be.instanceOf(Error);
  expect(run).to.throw((expected as Error).constructor as ErrorConstructor);
}

const objectId = () => new Types.ObjectId();

function leanWorkflow() {
  const step = (i: number) => ({
    _id: objectId(),
    _templateId: objectId(),
    stepId: `step-${i}`,
    active: true,
    filters: [{ isNegated: false, type: 'GROUP', children: [{ field: 'x', value: 'y', operator: 'EQUAL' }] }],
    template: {
      _id: objectId(),
      type: 'email',
      content: [{ type: 'text', content: 'hello' }],
      createdAt: new Date('2026-01-02T03:04:05.006Z'),
      _environmentId: objectId(),
    },
    metadata: { amount: 5, unit: 'minutes', missing: undefined },
  });

  return {
    _id: objectId(),
    _environmentId: objectId(),
    _organizationId: objectId(),
    name: 'workflow',
    steps: [step(0), step(1), step(2)],
    tags: ['a', 'b'],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:01.000Z'),
    dates: [new Date(0), new Date(1), objectId()],
    payloadSchema: { type: 'object', properties: { p: { type: 'string', default: 'v' } } },
    deleted: false,
  };
}

describe('toEntity / toJsonPlain', () => {
  describe('lean documents', () => {
    it('matches for ObjectIds and Dates at the top level, nested and in arrays', () => {
      const result = expectBoth(leanWorkflow(), NotificationTemplateEntity);

      expect(result).to.be.instanceOf(NotificationTemplateEntity);
      expect(result._id).to.be.a('string');
      expect(result.steps[0].template.createdAt).to.equal('2026-01-02T03:04:05.006Z');
    });

    it('matches for an array of documents (mapEntities)', () => {
      const docs = [leanWorkflow(), leanWorkflow()];
      const result = expectBoth(docs, NotificationTemplateEntity);

      expect(result).to.have.length(2);
      expect(result[1]).to.be.instanceOf(NotificationTemplateEntity);
    });

    it('matches for undefined, NaN, Infinity, -0 and nulls', () => {
      expectBoth({
        a: undefined,
        b: NaN,
        c: Infinity,
        d: -Infinity,
        e: -0,
        f: null,
        g: [undefined, NaN, null, -0, () => 1, Symbol('s')],
        h: { i: undefined, j: null, k: () => 1, l: Symbol('s') },
        m: 0,
        n: '',
        o: false,
        [Symbol('hidden')]: 1,
      });
    });

    it('matches for empty containers, sparse arrays and integer-like keys', () => {
      // biome-ignore lint/suspicious/noSparseArray: holes are part of the JSON contract under test
      expectBoth({ a: [], b: {}, c: [[], [{}]], d: [1, , 3], e: { 10: 'x', b: 1, 2: 'y', a: 2 } });
    });

    it('matches for wrapper objects, Buffers, built-ins without toJSON and toJSON that returns undefined', () => {
      expectBoth({
        number: Object(5),
        string: Object('s'),
        boolean: Object(false),
        infinite: Object(Infinity),
        buffer: Buffer.from('hi'),
        map: new Map([['a', 1]]),
        set: new Set([1]),
        regexp: /x/g,
        error: Object.assign(new Error('boom'), { code: 'E' }),
        invalidDate: new Date(Number.NaN),
        hidesItself: { toJSON: () => undefined },
        inArray: [{ toJSON: () => undefined }],
        nullProto: Object.assign(Object.create(null), { a: 1 }),
      });
    });

    it('passes the property key to toJSON like JSON.stringify does', () => {
      const keys: unknown[] = [];
      const spy = { toJSON: (key: unknown) => keys.push(key) };
      toJsonPlain({ a: spy, list: [spy] });
      const expectedKeys: unknown[] = [];
      const jsonSpy = { toJSON: (key: unknown) => expectedKeys.push(key) };
      JSON.stringify({ a: jsonSpy, list: [jsonSpy] });

      expect(keys).to.deep.equal(expectedKeys);
    });

    it('matches for keys class-transformer skips (__proto__, constructor, Object.prototype names)', () => {
      const withProto = JSON.parse('{"__proto__":{"polluted":true},"a":{"__proto__":{"polluted":true},"b":1}}');
      expectBoth(withProto);
      expect(({} as any).polluted).to.equal(undefined);
      expect(Object.getPrototypeOf(toJsonPlain<any>(withProto))).to.equal(Object.prototype);

      expectBoth({
        toString: 'x',
        valueOf: 1,
        hasOwnProperty: true,
        constructor: { name: 'root constructor' },
        nested: { toString: 'x', isPrototypeOf: 1, constructor: null, keep: 1 },
        falsy: { constructor: 0 },
        list: [{ toLocaleString: 'x', keep: 2 }],
      });
    });

    it('matches for primitives and null at the root', () => {
      for (const root of [null, 'text', 5, true, NaN, []]) {
        expectBoth(root);
      }
    });
  });

  describe('Mongoose values', () => {
    it('matches for Schema.Types.Mixed payloads that hold Dates and ObjectIds', () => {
      const doc = new NotificationTemplate({
        ...leanWorkflow(),
        data: { when: new Date('2026-05-05T00:00:00.000Z'), ref: objectId(), nested: [{ at: new Date(5) }] },
        rawData: { list: [objectId(), new Date(6), { deep: { id: objectId() } }] },
      });

      expectBoth(doc, NotificationTemplateEntity);
      expectBoth(doc.toObject(), NotificationTemplateEntity);
      expectBoth(doc.toObject({ virtuals: false, depopulate: true }), NotificationTemplateEntity);
    });

    it('matches for Map fields on agents (hosts.byId)', () => {
      const doc = new Agent({
        _environmentId: objectId(),
        _organizationId: objectId(),
        name: 'agent',
        identifier: 'agent',
        hosts: {
          byId: { claude: { connectedAt: '2026-01-01', via: 'cli' }, cursor: { lastCheckedAt: '2026-01-02' } },
          cli: { connectedAt: '2026-01-01' },
        },
      });

      const fromDoc = expectBoth(doc, AgentEntity);
      const fromObject = expectBoth(doc.toObject(), AgentEntity);
      expect(fromDoc.hosts.byId).to.deep.equal({
        claude: { connectedAt: '2026-01-01', via: 'cli' },
        cursor: { lastCheckedAt: '2026-01-02' },
      });
      // toObject() keeps Maps as native Maps, which JSON writes as {}; pre-existing, unchanged.
      expect(fromObject.hosts.byId).to.deep.equal({});
      const flattened = expectBoth(doc.toObject({ flattenMaps: true }), AgentEntity);
      expect(flattened.hosts.byId).to.deep.equal(fromDoc.hosts.byId);
    });

    it('matches for Map fields on tool trust (tools, mcp)', () => {
      const doc = new AgentToolTrust({
        _organizationId: objectId(),
        _environmentId: objectId(),
        _agentId: objectId(),
        _subscriberId: objectId(),
        trust: {
          mcp: { github: { serverDefault: 'always_ask', tools: { create_issue: 'always_allow' } } },
          direct: { tools: { search: 'always_ask' } },
        },
      });

      const fromDoc = expectBoth(doc, AgentToolTrustEntity);
      expect(fromDoc.trust.mcp.github.tools).to.deep.equal({ create_issue: 'always_allow' });
      expect(fromDoc.trust.direct.tools).to.deep.equal({ search: 'always_ask' });
      expect(expectBoth(doc.toObject(), AgentToolTrustEntity).trust.mcp).to.deep.equal({});
      expectBoth(doc.toObject({ flattenMaps: true }), AgentToolTrustEntity);
    });

    it('matches for .toObject() output with the id virtual from schemaOptions', () => {
      const doc = new Integration({
        _environmentId: objectId(),
        _organizationId: objectId(),
        providerId: 'sendgrid',
        channel: 'email',
        credentials: { apiKey: 'encrypted', tlsOptions: { at: new Date(7) } },
        active: true,
      });
      const object = doc.toObject();

      const result = expectBoth(object, IntegrationEntity);
      expect(result.id).to.equal(String(doc._id));
      expect(schemaOptions.toObject.virtuals).to.equal(true);
    });

    it('matches for raw (non-lean) Mongoose documents, alone and in arrays', () => {
      const docs = [0, 1, 2].map(
        (i) =>
          new Integration({
            _environmentId: objectId(),
            _organizationId: objectId(),
            providerId: `provider-${i}`,
            channel: 'sms',
            credentials: { user: 'u', secretKey: 's' },
            active: i % 2 === 0,
          })
      );

      const single = expectBoth(docs[0], IntegrationEntity);
      expect(single).to.be.instanceOf(IntegrationEntity);
      expect(single.id).to.equal(String(docs[0]._id));
      expectBoth(docs, IntegrationEntity);
    });

    it('matches for documents of an ad-hoc schema with subdocuments, arrays and Buffers', () => {
      const Model =
        mongoose.models.ToEntitySpec ||
        mongoose.model(
          'ToEntitySpec',
          new Schema(
            {
              name: String,
              sub: new Schema({ at: Date, ref: Schema.Types.ObjectId }),
              list: [new Schema({ value: Number, when: Date })],
              blob: Buffer,
              map: { type: Map, of: Schema.Types.Mixed },
              mixed: Schema.Types.Mixed,
            },
            schemaOptions
          )
        );
      const doc = new Model({
        name: 'n',
        sub: { at: new Date(1), ref: objectId() },
        list: [{ value: 1, when: new Date(2) }, { value: NaN }],
        blob: Buffer.from('bytes'),
        map: { a: { d: new Date(3) }, b: [objectId()] },
        mixed: { undef: undefined, inf: Infinity },
      });

      expectBoth(doc);
      expectBoth(doc.toObject());
    });
  });

  describe('errors', () => {
    it('throws like the JSON round-trip for undefined, BigInt and cycles', () => {
      const cycle: any = { a: { b: {} } };
      cycle.a.b.c = cycle;
      const cycleInArray: any = [];
      cycleInArray.push({ list: cycleInArray });

      for (const input of [undefined, () => 1, { big: BigInt(1) }, [Object(BigInt(1))], cycle, cycleInArray]) {
        expectSameError(
          () => toEntity(PlainEntity, input),
          () => legacyMapEntity(PlainEntity, input)
        );
        expectSameError(
          () => toJsonPlain(input),
          () => JSON.parse(JSON.stringify(input))
        );
      }
    });

    it('allows the same object twice when it is not a cycle', () => {
      const shared = { a: new Date(1) };
      expectBoth({ x: shared, y: shared, list: [shared, shared] });
    });
  });

  describe('fuzzed documents', () => {
    it('matches the legacy path on 500 random documents', () => {
      let seed = 42;
      const random = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;

        return seed / 2147483648;
      };
      const keys = ['a', 'b', '_id', 'toString', 'constructor', '__proto__', '0', '12', 'id', 'createdAt'];
      const leaf = (): unknown => {
        const pick = Math.floor(random() * 12);
        const values = [
          null,
          undefined,
          NaN,
          -0,
          random() * 100,
          'text',
          true,
          objectId(),
          new Date(Math.floor(random() * 1e12)),
          () => 1,
          Infinity,
          Buffer.from('x'),
        ];

        return values[pick];
      };
      const build = (depth: number): unknown => {
        if (depth === 0 || random() < 0.3) return leaf();
        if (random() < 0.4) return Array.from({ length: Math.floor(random() * 4) }, () => build(depth - 1));
        const object: Record<string, unknown> = {};
        for (let i = 0; i < Math.floor(random() * 5); i++) {
          const key = keys[Math.floor(random() * keys.length)];
          if (key === '__proto__') {
            Object.defineProperty(object, key, { value: build(depth - 1), enumerable: true, writable: true });
          } else if (key === 'constructor' && depth < 4) {
            // class-transformer throws on a nested truthy own `constructor`; covered by the root case only.
            continue;
          } else {
            object[key] = build(depth - 1);
          }
        }

        return object;
      };

      let checked = 0;
      while (checked < 500) {
        const doc = build(4);
        // JSON.stringify returns undefined for these roots; the errors test covers them.
        if (doc === undefined || typeof doc === 'function') continue;
        expectBoth(doc);
        checked += 1;
      }
    });
  });

  describe('class-transformer metadata guard', () => {
    it('keeps UserEntity a real instance so the serializer still strips password and tokens', () => {
      expect(canSkipClassTransformer(UserEntity)).to.equal(true);

      const user = expectBoth(
        {
          _id: objectId(),
          email: 'a@b.c',
          password: 'hash',
          tokens: [{ providerId: 'x', accessToken: 'secret' }],
          createdAt: new Date(1),
        },
        UserEntity
      );

      expect(user).to.be.instanceOf(UserEntity);
      expect(user.password).to.equal('hash');
      const serialized = instanceToPlain(user);
      expect(serialized).to.not.have.property('password');
      expect(serialized).to.not.have.property('tokens');
      expect(serialized.email).to.equal('a@b.c');
    });

    /*
     * Decorators are applied as functions on classes without field declarations: vitest compiles
     * class fields as ES2022 defined fields, which would give every instance own keys. The DAL is
     * compiled to ES2021, so its entity classes have empty instances.
     */
    it('falls back to class-transformer for classes it cannot reproduce', () => {
      class Child {}
      class WithType {}
      Type(() => Child)(WithType.prototype, 'child');
      class WithTransform {}
      Transform(({ value }) => String(value).toUpperCase())(WithTransform.prototype, 'name');
      class WithExclude {}
      Exclude()(WithExclude.prototype, 'secret');
      class WithInitializer {
        status = 'draft';
      }
      class WithGetter {
        get label() {
          return 'x';
        }
      }
      class InheritsType extends WithType {}

      for (const entityClass of [WithType, WithTransform, WithExclude, WithInitializer, WithGetter, InheritsType]) {
        expect(canSkipClassTransformer(entityClass), entityClass.name).to.equal(false);
      }

      const withType = expectEntityParity(WithType, { child: { name: 'c' } });
      expect(withType.child).to.be.instanceOf(Child);
      expect(expectEntityParity(WithTransform, { name: 'n' }).name).to.equal('N');
      expect(expectEntityParity(WithExclude, { secret: 's', a: 1 })).to.not.have.property('secret');
      expect(expectEntityParity(WithInitializer, { a: 1 }).status).to.equal('draft');
      expect(expectEntityParity(InheritsType, { child: { name: 'c' } }).child).to.be.instanceOf(Child);
    });

    it('takes the fast path for toPlainOnly metadata and for methods, skipping keys that shadow methods', () => {
      class WithMethod {
        describe() {
          return 'method';
        }
      }
      class WithPlainOnly {}
      Exclude({ toPlainOnly: true })(WithPlainOnly.prototype, 'secret');
      Transform(({ value }) => value, { toPlainOnly: true })(WithPlainOnly.prototype, 'name');

      expect(canSkipClassTransformer(WithMethod)).to.equal(true);
      expect(canSkipClassTransformer(WithPlainOnly)).to.equal(true);

      const result = expectEntityParity(WithMethod, { describe: 'data', a: 1 });
      expect(result.describe()).to.equal('method');
      expect(result.a).to.equal(1);
      expect(instanceToPlain(expectEntityParity(WithPlainOnly, { secret: 's', name: 'n' }))).to.deep.equal({
        name: 'n',
      });
    });
  });
});
