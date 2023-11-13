import { INestApplication } from '@nestjs/common';
import { INovuWorker, ReadinessService } from '@novu/application-generic';

import { StandardWorker } from './standard.worker';
import { SubscriberProcessWorker } from './subscriber-process.worker';
import { WorkflowWorker } from './workflow.worker';

const getWorkers = (app: INestApplication): INovuWorker[] => {
  const standardWorker = app.get(StandardWorker, { strict: false });
  const workflowWorker = app.get(WorkflowWorker, { strict: false });
  const subscriberProcessWorker = app.get(SubscriberProcessWorker, { strict: false });

  const workers: INovuWorker[] = [standardWorker, workflowWorker, subscriberProcessWorker];

  return workers;
};

export const prepareAppInfra = async (app: INestApplication): Promise<void> => {
  const readinessService = app.get(ReadinessService);
  const workers = getWorkers(app);

  await readinessService.pauseWorkers(workers);
};

export const startAppInfra = async (app: INestApplication): Promise<void> => {
  const readinessService = app.get(ReadinessService);
  const workers = getWorkers(app);
  await readinessService.enableWorkers(workers);
};
