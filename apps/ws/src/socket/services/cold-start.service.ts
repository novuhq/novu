import { INestApplication } from '@nestjs/common';
import { INovuWorker, ReadinessService } from '@novu/application-generic';
import { WebSocketWorker } from './web-socket.worker';

const getWorkers = (app: INestApplication): INovuWorker[] => {
  const webSocketWorker = app.get(WebSocketWorker, { strict: false });

  const workers: INovuWorker[] = [webSocketWorker];

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
