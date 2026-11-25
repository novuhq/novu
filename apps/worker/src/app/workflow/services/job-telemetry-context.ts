import { PinoLogger, Store, storage } from '@novu/application-generic';

const nr = require('newrelic');

type JobTelemetryContext = {
  organizationId: string;
  environmentId: string;
  transactionId?: string;
};

/**
 * Runs a job in its own logger scope with these ids already bound, so every line the job writes carries them,
 * including an error thrown before a usecase adds its own fields. Usecases must not assign these ids again, or pino
 * writes each of those keys twice. Adds the same ids to the job's New Relic transaction, so call it inside
 * `startBackgroundTransaction`.
 */
export function runInJobTelemetryContext<T>(context: JobTelemetryContext, callback: () => T): T {
  nr.addCustomAttributes(context);

  // `root` is set when the HTTP app starts, which specs that only compile a module never do.
  return storage.run(new Store(PinoLogger.root?.child(context)), callback);
}
