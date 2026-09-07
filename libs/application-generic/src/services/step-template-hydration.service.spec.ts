import { JobEntity, NotificationTemplateEntity } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import {
  StepTemplateHydrationService,
  StepTemplateHydrationStatus,
  toLeanStep,
} from './step-template-hydration.service';

type TestTemplate = { _id?: string; type?: StepTypeEnum; _environmentId?: string; content?: string };
type TestJob = {
  _id: string;
  _environmentId: string;
  _organizationId: string;
  _templateId?: string;
  type: StepTypeEnum;
  step: {
    _id?: string;
    uuid?: string;
    stepId?: string;
    _templateId?: string;
    bridgeUrl?: string;
    template: TestTemplate;
  };
};

/**
 * Guards the read side of job-step-dedup: restoring a lean `{ _id, type }`
 * template stub from the live workflow (or DB / soft-deleted fallbacks) while
 * leaving full-snapshot and stateless jobs untouched. Constructed directly with
 * a single mocked repository — no orchestrator wiring, no private poking.
 */
describe('StepTemplateHydrationService', () => {
  function buildService() {
    const messageTemplateRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      findDeleted: jest.fn().mockResolvedValue(null),
    };
    const logger = { warn: jest.fn(), setContext: jest.fn() };
    const service = new StepTemplateHydrationService(messageTemplateRepository as never, logger as never);

    return { service, messageTemplateRepository, logger };
  }

  function buildLeanJob(overrides: Partial<TestJob> = {}): TestJob {
    return {
      _id: 'job_1',
      _environmentId: 'env_1',
      _organizationId: 'org_1',
      _templateId: 'wf_1',
      type: StepTypeEnum.EMAIL,
      step: {
        _id: 'step_1',
        uuid: 'uuid_1',
        stepId: 'email-step',
        _templateId: 'mt_1',
        template: { _id: 'mt_1', type: StepTypeEnum.EMAIL },
      },
      ...overrides,
    };
  }

  const fullTemplate: TestTemplate = {
    _id: 'mt_1',
    _environmentId: 'env_1',
    type: StepTypeEnum.EMAIL,
    content: 'Hi {{name}}',
  };

  const hydrate = (service: StepTemplateHydrationService, job: TestJob, workflow?: { steps: unknown[] }) =>
    service.hydrateJobStep(job as unknown as JobEntity, workflow as unknown as NotificationTemplateEntity);

  it('skips a full snapshot (template already carries _environmentId)', async () => {
    const { service, messageTemplateRepository } = buildService();
    const snapshot = { _id: 'mt_1', _environmentId: 'env_1', type: StepTypeEnum.EMAIL, content: 'body' };
    const job = buildLeanJob({ step: { _id: 'step_1', _templateId: 'mt_1', template: snapshot } });

    const status = await hydrate(service, job);

    expect(status).toBe(StepTemplateHydrationStatus.SKIPPED);
    expect(job.step.template).toBe(snapshot);
    expect(messageTemplateRepository.findOne).not.toHaveBeenCalled();
  });

  it('skips stateless jobs (no _templateId)', async () => {
    const { service, messageTemplateRepository } = buildService();
    const job = buildLeanJob({ _templateId: undefined });

    const status = await hydrate(service, job);

    expect(status).toBe(StepTemplateHydrationStatus.SKIPPED);
    expect(messageTemplateRepository.findOne).not.toHaveBeenCalled();
  });

  it('skips bridgeUrl jobs even when a synced _templateId is present', async () => {
    const { service, messageTemplateRepository } = buildService();
    const job = buildLeanJob({
      step: {
        _id: 'step_1',
        uuid: 'uuid_1',
        stepId: 'email-step',
        _templateId: 'mt_1',
        bridgeUrl: 'https://tunnel.example.com/api/novu',
        template: { _id: 'mt_1', type: StepTypeEnum.EMAIL },
      },
    });

    const status = await hydrate(service, job);

    expect(status).toBe(StepTemplateHydrationStatus.SKIPPED);
    expect(messageTemplateRepository.findOne).not.toHaveBeenCalled();
  });

  it('hydrates from the live workflow step in memory (no DB call)', async () => {
    const { service, messageTemplateRepository } = buildService();
    const job = buildLeanJob();
    const workflow = { steps: [{ _id: 'step_1', uuid: 'uuid_1', template: fullTemplate }] };

    const status = await hydrate(service, job, workflow);

    expect(status).toBe(StepTemplateHydrationStatus.HYDRATED);
    expect(job.step.template).toBe(fullTemplate);
    expect(messageTemplateRepository.findOne).not.toHaveBeenCalled();
  });

  it('matches the workflow step by uuid when _id differs', async () => {
    const { service } = buildService();
    const job = buildLeanJob();
    const workflow = { steps: [{ _id: 'other', uuid: 'uuid_1', template: fullTemplate }] };

    const status = await hydrate(service, job, workflow);

    expect(status).toBe(StepTemplateHydrationStatus.HYDRATED);
    expect(job.step.template).toBe(fullTemplate);
  });

  it('falls back to a direct message-template lookup when the step left the workflow', async () => {
    const { service, messageTemplateRepository } = buildService();
    messageTemplateRepository.findOne.mockResolvedValue(fullTemplate);
    const job = buildLeanJob();

    const status = await hydrate(service, job, { steps: [] });

    expect(status).toBe(StepTemplateHydrationStatus.HYDRATED);
    expect(messageTemplateRepository.findOne).toHaveBeenCalledWith({ _id: 'mt_1', _environmentId: 'env_1' });
    expect(job.step.template).toBe(fullTemplate);
  });

  it('falls back to the soft-deleted template', async () => {
    const { service, messageTemplateRepository } = buildService();
    messageTemplateRepository.findOne.mockResolvedValue(null);
    messageTemplateRepository.findDeleted.mockResolvedValue(fullTemplate);
    const job = buildLeanJob();

    const status = await hydrate(service, job, { steps: [] });

    expect(status).toBe(StepTemplateHydrationStatus.HYDRATED);
    expect(messageTemplateRepository.findDeleted).toHaveBeenCalledWith({ _id: 'mt_1', _environmentId: 'env_1' });
    expect(job.step.template).toBe(fullTemplate);
  });

  it('rejects a resolved template whose channel changed, reporting UNRESOLVED', async () => {
    const { service, messageTemplateRepository } = buildService();
    messageTemplateRepository.findOne.mockResolvedValue({
      _id: 'mt_1',
      _environmentId: 'env_1',
      type: StepTypeEnum.SMS,
    });
    const job = buildLeanJob();

    const status = await hydrate(service, job, { steps: [] });

    expect(status).toBe(StepTemplateHydrationStatus.UNRESOLVED);
  });

  it('reports UNRESOLVED for a lean channel step with no resolvable template', async () => {
    const { service } = buildService();
    const job = buildLeanJob();

    const status = await hydrate(service, job, { steps: [] });

    expect(status).toBe(StepTemplateHydrationStatus.UNRESOLVED);
  });

  it('skips (does not fail) a non-rendering lean step that cannot resolve', async () => {
    const { service } = buildService();
    const job = buildLeanJob({
      type: StepTypeEnum.DELAY,
      step: { _id: 'step_1', _templateId: 'mt_1', template: { _id: 'mt_1', type: StepTypeEnum.DELAY } },
    });

    const status = await hydrate(service, job, { steps: [] });

    expect(status).toBe(StepTemplateHydrationStatus.SKIPPED);
  });
});

/**
 * Write side of the same contract: the pure projection persisted on a job when
 * IS_JOB_STEP_DEDUP_ENABLED is on. Tested directly (no usecase/DI construction).
 */
describe('toLeanStep', () => {
  const fullStep = {
    _id: 'step_1',
    uuid: 'uuid_1',
    stepId: 'email-step',
    name: 'Email step',
    _templateId: 'mt_1',
    _parentId: 'parent_1',
    active: true,
    shouldStopOnFail: false,
    filters: [{ isNegated: false, type: 'GROUP', value: 'AND', children: [] }],
    metadata: { amount: 1, unit: 'minutes' },
    controlVariables: { foo: 'bar' },
    issues: { body: [] },
    template: {
      _id: 'mt_1',
      _environmentId: 'env_1',
      type: StepTypeEnum.EMAIL,
      content: 'Hello {{name}} '.repeat(100),
      controls: { schema: { type: 'object' } },
      cta: { data: { url: 'https://example.com' } },
      variables: [{ name: 'name' }],
    },
  } as never;

  it('keeps only lean fields and replaces the template with a { _id, type } stub', () => {
    const lean = toLeanStep(fullStep);

    expect(lean).toEqual({
      _id: 'step_1',
      uuid: 'uuid_1',
      stepId: 'email-step',
      name: 'Email step',
      _templateId: 'mt_1',
      _parentId: 'parent_1',
      active: true,
      shouldStopOnFail: false,
      filters: [{ isNegated: false, type: 'GROUP', value: 'AND', children: [] }],
      metadata: { amount: 1, unit: 'minutes' },
      replyCallback: undefined,
      controlVariables: { foo: 'bar' },
      template: { _id: 'mt_1', type: StepTypeEnum.EMAIL },
    });
  });

  it('drops the template body (content/controls/cta/variables) and step issues', () => {
    const lean = toLeanStep(fullStep) as Record<string, unknown>;
    const template = lean.template as Record<string, unknown>;

    expect(template.content).toBeUndefined();
    expect(template.controls).toBeUndefined();
    expect(template.cta).toBeUndefined();
    expect(template.variables).toBeUndefined();
    expect(lean.issues).toBeUndefined();
  });

  it('falls back to the step _templateId when the template carries no _id', () => {
    const lean = toLeanStep({ _templateId: 'mt_2', template: { type: StepTypeEnum.SMS } } as never);

    expect(lean.template).toEqual({ _id: 'mt_2', type: StepTypeEnum.SMS });
  });
});
