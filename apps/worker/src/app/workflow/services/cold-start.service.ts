import { INestApplication } from '@nestjs/common';
import { INovuWorker, ReadinessService } from '@novu/application-generic';

import { StandardWorker } from './standard.worker';
import { WorkflowWorker } from './workflow.worker';
import { OldInstanceWorkflowWorker } from './old-instance-workflow.worker';

/**
 * TODO: Temporary engage OldInstanceWorkflowWorker while migrating to MemoryDB
 */
const getWorkers = (app: INestApplication): INovuWorker[] => {
  const standardWorker = app.get(StandardWorker, { strict: false });
  const workflowWorker = app.get(WorkflowWorker, { strict: false });
  const oldInstanceWorkflowWorker = app.get(OldInstanceWorkflowWorker, { strict: false });

  const workers: INovuWorker[] = [standardWorker, workflowWorker, oldInstanceWorkflowWorker];

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
