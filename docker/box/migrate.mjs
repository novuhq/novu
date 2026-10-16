// `box migrate`: replica set, Redis Cluster, Mongo indexes, ClickHouse migrations, S3 bucket (process-compose runs
// it before the apps).

import fs from 'node:fs';
import { createRequire } from 'node:module';
import { DATA, env, log, MIGRATED, output, poll, REDIS_PORTS, REDIS_TLS, REPO, RUN, run } from './lib.mjs';

// Atlas runs a replica set even for one node; transactions and change streams need it.
async function initReplicaSet(MongoClient) {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/?directConnection=true');
  try {
    const admin = client.db('admin');
    await admin.command({ replSetGetStatus: 1 }).catch(async (error) => {
      if (error.codeName !== 'NotYetInitialized') throw error;
      log('initiating replica set rs0');
      await admin.command({ replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] } });
    });
    const primary = async () => (await admin.command({ hello: 1 })).isWritablePrimary;
    await poll(60, primary, 'replica set has no writable primary after 60s', 500);
  } finally {
    await client.close();
  }
}

export function redis(port, args) {
  return output('redis-cli', ['--tls', '--cacert', `${REDIS_TLS}/box.crt`, '-p', String(port), ...args], { cwd: RUN });
}

async function createRedisCluster() {
  if (/cluster_slots_assigned:0\b/.test(redis(REDIS_PORTS[0], ['cluster', 'info']))) {
    log('creating Redis Cluster');
    redis(REDIS_PORTS[0], [
      '--cluster',
      'create',
      ...REDIS_PORTS.map((port) => `127.0.0.1:${port}`),
      '--cluster-replicas',
      '0',
      '--cluster-yes',
    ]);
  }
  const ok = () => /cluster_state:ok/.test(redis(REDIS_PORTS[0], ['cluster', 'info']));
  await poll(30, ok, 'Redis Cluster not ok after 30s', 500);
}

// Production runs with MONGO_AUTO_CREATE_INDEXES=false, so the box applies the indexes declared in
// the checked-out schemas explicitly and logs every difference, which is what a PR's index change does.
async function syncIndexes(mongoose, requireDal) {
  Object.assign(process.env, env);
  requireDal('./dist/index.js');
  await mongoose.connect(env.MONGO_URL, { autoIndex: false });
  try {
    for (const model of Object.values(mongoose.models)) {
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
          log(`WARN: index conflict on ${model.collection.collectionName} ${JSON.stringify(spec)}: ${err.message}`);
        }
      }
      log(`indexes ${model.collection.collectionName}: created ${created} dropped ${JSON.stringify(toDrop)}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

export async function migrate() {
  const head = output('git', ['rev-parse', 'HEAD']);
  if (fs.existsSync(MIGRATED) && fs.readFileSync(MIGRATED, 'utf8') === head) {
    log(`already migrated at ${head.slice(0, 10)}`);

    return;
  }
  const requireDal = createRequire(`${REPO}/libs/dal/package.json`);
  const mongoose = requireDal('mongoose');
  await initReplicaSet(mongoose.mongo.MongoClient);
  await createRedisCluster();
  await syncIndexes(mongoose, requireDal);
  fs.mkdirSync(`${DATA}/s3/${env.S3_BUCKET_NAME}`, { recursive: true });
  run(
    'node_modules/.bin/clickhouse-migrations',
    [
      'migrate',
      `--host=${env.CLICK_HOUSE_URL}`,
      `--user=${env.CLICK_HOUSE_USER}`,
      `--password=${env.CLICK_HOUSE_PASSWORD}`,
      `--db=${env.CLICK_HOUSE_DATABASE}`,
      '--migrations-home=./migrations/clickhouse-migrations',
    ],
    { cwd: `${REPO}/apps/api` }
  );
  fs.writeFileSync(MIGRATED, head);
}
