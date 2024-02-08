export type CronOptions = {
  /** Max number of locked jobs of this kind */
  lockLimit?: number;
  /** Lock lifetime in milliseconds */
  lockLifetime?: number;
  /** Higher priority jobs will run first. */
  priority?: number;
  /** How many jobs of this kind can run in parallel/simultaneously per Cron instance */
  concurrency?: number;
  /**
   * The IANA timezone that the job should be run in.
   * @see https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
   */
  timezone?: string;
};

export type CronJobData<TData, TName extends string = string> = {
  /** The name of the job */
  name: string;
  /** The time the job was scheduled to start at */
  startedAt: Date;
  /** The custom data provided for the job run */
  data: TData;
};

export type CronJobProcessor<TData> = (
  job: CronJobData<TData>
) => Promise<void>;

export type CronMetrics = {
  [jobName: string]: {
    /** The number of jobs that are currently running */
    active: number;
    /** The number of jobs that are currently waiting to be run */
    waiting: number;
  };
};
