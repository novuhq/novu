import {
  Agenda,
  IDatabaseOptions,
  IDbConfig,
  IMongoOptions,
} from '@hokify/agenda';

export type AgendaFactoryOptions = {
  defaultConcurrency?: number;
  processEvery?: string | number;
  maxConcurrency?: number;
  defaultLockLimit?: number;
  lockLimit?: number;
  defaultLockLifetime?: number;
} & (IDatabaseOptions | IMongoOptions) &
  IDbConfig;

const getAgendaOpts = (): AgendaFactoryOptions => {
  return {
    db: { address: String(process.env.MONGO_URL) },
    defaultConcurrency: +(process.env.SCHEDULER_DEFAULT_CONCURRENCY || 5),
    processEvery: +(process.env.SCHEDULER_PROCESS_EVERY_MS || 5000), //5 seconds
    maxConcurrency: +(process.env.SCHEDULER_MAX_CONCURRENCY || 20),
    defaultLockLimit: +(process.env.SCHEDULER_DEFAULT_LOCK_LIMIT || 0),
    lockLimit: +(process.env.SCHEDULER_LOCK_LIMIT || 0),
    defaultLockLifetime: +(
      process.env.SCHEDULER_LOCK_LIFETIME_MS || 10 * 60 * 1000
    ), //10 minutes
  };
};

export const buildAgendaScheduler = async (): Promise<Agenda> => {
  return new Promise((resolve, reject) => {
    const opts = getAgendaOpts();
    const agenda = new Agenda(opts, (err) => {
      if (err) {
        reject(err);
      }
    });
    agenda
      .start()
      .then(() => resolve(agenda))
      .catch(reject);
  });
};
