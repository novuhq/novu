import { INestApplication } from '@nestjs/common';
import { INovuWorker, ReadinessService } from '@novu/application-generic';

const getWorkers = (app: INestApplication): INovuWorker[] => {
  const workers = app.get('ACTIVE_WORKERS');

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
