/* eslint-disable */
export default async () => {
  const t = {
    ['../../../libs/dal/dist/repositories/job/job.entity']: await import(
      '../../../libs/dal/dist/repositories/job/job.entity'
    ),
  };
  return {
    '@nestjs/swagger': {
      models: [
        [
          import('./app/workflow/usecases/webhook-filter-backoff-strategy/event-job.dto'),
          {
            EventJobDto: {
              data: { required: true, type: () => t['../../../libs/dal/dist/repositories/job/job.entity'].JobEntity },
            },
          },
        ],
      ],
      controllers: [
        [import('./app/health/health.controller'), { HealthController: { healthCheck: { type: Object } } }],
      ],
    },
  };
};
