// `box migrate`: replica set, Redis Cluster, Mongo indexes, ClickHouse migrations, S3 bucket (process-compose runs
// it before the apps). Mongo goes through the checkout's own mongoose (libs/dal), so it matches what the apps use.

import fs from 'node:fs';
import { createRequire } from 'node:module';
import { log } from '../node/main.ts';
import { poll } from '../node/poll.ts';
import { DATA, MIGRATED, REDIS_PORTS, REDIS_TLS, REPO, RUN } from './paths.ts';
import { output, run, vars } from './runtime.ts';

// What the box uses of the checkout's mongoose and its mongodb driver.
interface MongoClient {
  db(name?: string): MongoDb;
  close(): Promise<void>;
}
interface MongoDb {
  command(command: object): Promise<{ isWritablePrimary?: boolean }>;
  listCollections(filter: object, options: object): { toArray(): Promise<Array<{ name: string }>> };
  collection(name: string): MongoCollection;
}
interface MongoCollection {
  find(): { toArray(): Promise<Array<MongoDoc>> };
  findOne(filter: object): Promise<MongoDoc | null>;
  insertOne(doc: MongoDoc): Promise<object>;
  deleteOne(filter: object): Promise<object>;
  replaceOne(filter: object, doc: MongoDoc): Promise<object>;
  updateOne(filter: object, update: object): Promise<object>;
}
type MongoDoc = Record<string, unknown>;
interface Model {
  init(): Promise<void>;
  diffIndexes(options: object): Promise<{ toCreate: Array<object>; toDrop: Array<string> }>;
  cleanIndexes(options: object): Promise<void>;
  createIndexes(options: object): Promise<void>;
  collection: { collectionName: string };
}
interface Mongoose {
  connect(url: string | undefined, options: object): Promise<void>;
  disconnect(): Promise<void>;
  models: Record<string, Model>;
  mongo: {
    MongoClient: { connect(url: string | undefined): Promise<MongoClient> };
    ObjectId: new (id: string) => object;
    BSON: {
      EJSON: {
        stringify(doc: MongoDoc, options: object): string;
        parse(text: string, options: object): MongoDoc;
      };
    };
  };
}

export function checkoutMongoose(): { mongoose: Mongoose; requireDal: NodeJS.Require } {
  const requireDal = createRequire(`${REPO}/libs/dal/package.json`);

  return { mongoose: requireDal('mongoose'), requireDal };
}

// Atlas runs a replica set even for one node; transactions and change streams need it.
async function initReplicaSet(mongoose: Mongoose): Promise<void> {
  const client = await mongoose.mongo.MongoClient.connect('mongodb://127.0.0.1:27017/?directConnection=true');
  try {
    const admin = client.db('admin');
    await admin.command({ replSetGetStatus: 1 }).catch(async (error: { codeName?: string }) => {
      if (error.codeName !== 'NotYetInitialized') throw error;
      log('initiating replica set rs0');
      await admin.command({ replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] } });
    });
    await poll(async () => Boolean((await admin.command({ hello: 1 })).isWritablePrimary), {
      timeoutMs: 60_000,
      everyMs: 500,
      what: 'replica set has no writable primary',
    });
  } finally {
    await client.close();
  }
}

export function redis(port: number, args: ReadonlyArray<string>): Promise<string> {
  return output('redis-cli', ['--tls', '--cacert', `${REDIS_TLS}/box.crt`, '-p', String(port), ...args], { cwd: RUN });
}

async function createRedisCluster(): Promise<void> {
  const [first] = REDIS_PORTS;
  if (/cluster_slots_assigned:0\b/.test(await redis(first, ['cluster', 'info']))) {
    log('creating Redis Cluster');
    const nodes = REDIS_PORTS.map((port) => `127.0.0.1:${port}`);
    await redis(first, ['--cluster', 'create', ...nodes, '--cluster-replicas', '0', '--cluster-yes']);
  }
  await poll(async () => /cluster_state:ok/.test(await redis(first, ['cluster', 'info'])), {
    timeoutMs: 30_000,
    everyMs: 500,
    what: 'Redis Cluster not ok',
  });
}

// Production runs with MONGO_AUTO_CREATE_INDEXES=false, so the box applies the indexes declared in
// the checked-out schemas explicitly and logs every difference, which is what a PR's index change does.
async function syncIndexes(mongoose: Mongoose, requireDal: NodeJS.Require): Promise<void> {
  Object.assign(process.env, vars);
  requireDal('./dist/index.js');
  await mongoose.connect(vars.MONGO_URL, { autoIndex: false });
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
        } catch (error) {
          const why = error instanceof Error ? error.message : String(error);
          log(`WARN: index conflict on ${model.collection.collectionName} ${JSON.stringify(spec)}: ${why}`);
        }
      }
      log(`indexes ${model.collection.collectionName}: created ${created} dropped ${JSON.stringify(toDrop)}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

export async function migrate(): Promise<void> {
  const head = await output('git', ['rev-parse', 'HEAD']);
  if (fs.existsSync(MIGRATED) && fs.readFileSync(MIGRATED, 'utf8') === head) {
    log(`already migrated at ${head.slice(0, 10)}`);

    return;
  }
  const { mongoose, requireDal } = checkoutMongoose();
  await initReplicaSet(mongoose);
  await createRedisCluster();
  await syncIndexes(mongoose, requireDal);
  fs.mkdirSync(`${DATA}/s3/${vars.S3_BUCKET_NAME}`, { recursive: true });
  await run(
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
}
