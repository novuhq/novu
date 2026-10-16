// `box migrate`: replica set, Redis Cluster, Mongo indexes, ClickHouse migrations, S3 bucket (process-compose runs
// it before the apps). Mongo goes through the checkout's own mongoose (libs/dal), so it matches what the apps use.

import fs from 'node:fs';
import { createRequire } from 'node:module';
import { Effect } from 'effect';
import { BoxError } from './errors.ts';
import type { Json } from './http.ts';
import { DATA, MIGRATED, REDIS_PORTS, REDIS_TLS, REPO, RUN } from './paths.ts';
import { BoxEnv, log, poll, Shell } from './runtime.ts';

const promise = <A>(what: string, f: () => Promise<A>) =>
  Effect.tryPromise({
    try: f,
    catch: (error) => new BoxError({ message: `${what}: ${(error as Error)?.message ?? error}` }),
  });

// Atlas runs a replica set even for one node; transactions and change streams need it.
const initReplicaSet = Effect.fn('initReplicaSet')(function* (MongoClient: Json) {
  const client: Json = yield* promise('mongo', () =>
    MongoClient.connect('mongodb://127.0.0.1:27017/?directConnection=true')
  );
  yield* Effect.gen(function* () {
    const admin = client.db('admin');
    yield* promise('replica set', () =>
      admin.command({ replSetGetStatus: 1 }).catch(async (error: Json) => {
        if (error.codeName !== 'NotYetInitialized') throw error;
        log('initiating replica set rs0');
        await admin.command({ replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] } });
      })
    );
    const primary = promise('hello', async () => Boolean((await admin.command({ hello: 1 })).isWritablePrimary));
    yield* poll(60, primary, 'replica set has no writable primary after 60s', 500);
  }).pipe(Effect.ensuring(Effect.promise(() => client.close())));
});

export const redis = Effect.fn('redis')(function* (port: number, args: ReadonlyArray<string>) {
  const shell = yield* Shell;

  return yield* shell.output('redis-cli', ['--tls', '--cacert', `${REDIS_TLS}/box.crt`, '-p', String(port), ...args], {
    cwd: RUN,
  });
});

const createRedisCluster = Effect.gen(function* () {
  const [first] = REDIS_PORTS;
  if (/cluster_slots_assigned:0\b/.test(yield* redis(first, ['cluster', 'info']))) {
    log('creating Redis Cluster');
    yield* redis(first, [
      '--cluster',
      'create',
      ...REDIS_PORTS.map((port) => `127.0.0.1:${port}`),
      '--cluster-replicas',
      '0',
      '--cluster-yes',
    ]);
  }
  const ok = Effect.map(redis(first, ['cluster', 'info']), (info) => /cluster_state:ok/.test(info));
  yield* poll(30, ok, 'Redis Cluster not ok after 30s', 500);
});

// Production runs with MONGO_AUTO_CREATE_INDEXES=false, so the box applies the indexes declared in
// the checked-out schemas explicitly and logs every difference, which is what a PR's index change does.
const syncIndexes = Effect.fn('syncIndexes')(function* (mongoose: Json, requireDal: NodeJS.Require) {
  const { vars } = yield* BoxEnv;
  Object.assign(process.env, vars);
  requireDal('./dist/index.js');
  yield* promise('mongoose', () => mongoose.connect(vars.MONGO_URL, { autoIndex: false }));
  yield* promise('indexes', async () => {
    for (const model of Object.values(mongoose.models) as Array<Json>) {
      await model.init();
      const { toCreate, toDrop } = await model.diffIndexes({ indexOptionsToCreate: true });
      if (!toCreate.length && !toDrop.length) continue;
      await model.cleanIndexes({ toDrop });
      // One at a time: a schema that declares conflicting indexes must not skip the rest of its collection.
      let created = 0;
      for (const spec of toCreate) {
        try {
          await model.createIndexes({ toCreate: [spec] });
          created++;
        } catch (err) {
          log(
            `WARN: index conflict on ${model.collection.collectionName} ${JSON.stringify(spec)}: ${(err as Error).message}`
          );
        }
      }
      log(`indexes ${model.collection.collectionName}: created ${created} dropped ${JSON.stringify(toDrop)}`);
    }
  }).pipe(Effect.ensuring(Effect.promise(() => mongoose.disconnect())));
});

export const migrate = Effect.gen(function* () {
  const shell = yield* Shell;
  const { vars } = yield* BoxEnv;
  const head = yield* shell.output('git', ['rev-parse', 'HEAD']);
  if (fs.existsSync(MIGRATED) && fs.readFileSync(MIGRATED, 'utf8') === head) {
    log(`already migrated at ${head.slice(0, 10)}`);

    return;
  }
  const requireDal = createRequire(`${REPO}/libs/dal/package.json`);
  const mongoose = requireDal('mongoose');
  yield* initReplicaSet(mongoose.mongo.MongoClient);
  yield* createRedisCluster;
  yield* syncIndexes(mongoose, requireDal);
  fs.mkdirSync(`${DATA}/s3/${vars.S3_BUCKET_NAME}`, { recursive: true });
  yield* shell.run(
    'node_modules/.bin/clickhouse-migrations',
    [
      'migrate',
      `--host=${vars.CLICK_HOUSE_URL}`,
      `--user=${vars.CLICK_HOUSE_USER}`,
      `--password=${vars.CLICK_HOUSE_PASSWORD}`,
      `--db=${vars.CLICK_HOUSE_DATABASE}`,
      '--migrations-home=./migrations/clickhouse-migrations',
    ],
    { cwd: `${REPO}/apps/api` }
  );
  fs.writeFileSync(MIGRATED, head);
});
