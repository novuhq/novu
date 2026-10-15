import { ConflictException } from '@nestjs/common';
import { PreferencesTypeEnum, ResourceOriginEnum, StepTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { CopyKeylessWorkflows } from './copy-keyless-workflows.usecase';

describe('CopyKeylessWorkflows', () => {
  const scope = {
    sourceEnvironmentId: 'keyless_env',
    sourceOrganizationId: 'keyless_org',
    targetEnvironmentId: 'dev_env',
    targetOrganizationId: 'target_org',
  };
  const claimer = { _id: 'claimer', organizationId: 'target_org', environmentId: 'claimer_env' } as never;

  function template(identifier: string, origin = ResourceOriginEnum.NOVU_CLOUD) {
    return { _id: `${identifier}_id`, origin, triggers: [{ identifier }] };
  }

  function sourceWorkflow(workflowId: string) {
    return {
      _id: `${workflowId}_id`,
      workflowId,
      name: workflowId,
      origin: ResourceOriginEnum.NOVU_CLOUD,
      steps: [
        {
          stepId: 'email',
          name: 'Email',
          type: StepTypeEnum.EMAIL,
          controls: { values: { subject: 'Hi', layoutId: 'keyless_layout' } },
        },
        { stepId: 'in-app', name: 'In-App', type: StepTypeEnum.IN_APP, controls: { values: { body: 'Hey' } } },
      ],
    };
  }

  function setup() {
    const notificationTemplateRepository = { find: sinon.stub() };
    notificationTemplateRepository.find.onFirstCall().resolves([]);
    notificationTemplateRepository.find.onSecondCall().resolves([]);
    const getWorkflowUseCase = {
      execute: sinon.stub().callsFake(async (command) => sourceWorkflow(command.workflowIdOrInternalId)),
    };
    const preferencesRepository = {
      find: sinon.stub().resolves([
        {
          type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
          preferences: { all: { enabled: true, readOnly: false }, channels: {} },
        },
      ]),
    };
    const upsertWorkflowUseCase = {
      execute: sinon.stub().callsFake(async (command) => ({ _id: `copy_of_${command.workflowDto.workflowId}` })),
    };
    const deleteWorkflowUseCase = { execute: sinon.stub().resolves() };
    const logger = { setContext: sinon.stub(), warn: sinon.stub(), error: sinon.stub(), info: sinon.stub() };

    const usecase = new CopyKeylessWorkflows(
      notificationTemplateRepository as never,
      getWorkflowUseCase as never,
      preferencesRepository as never,
      upsertWorkflowUseCase as never,
      deleteWorkflowUseCase as never,
      logger as never
    );

    return {
      usecase,
      notificationTemplateRepository,
      getWorkflowUseCase,
      upsertWorkflowUseCase,
      deleteWorkflowUseCase,
      logger,
    };
  }

  describe('preflight', () => {
    it('copies every dashboard workflow when the target has none of them', async () => {
      const { usecase, notificationTemplateRepository } = setup();
      notificationTemplateRepository.find.onFirstCall().resolves([template('order-shipped'), template('hello-world')]);

      expect(await usecase.preflight(scope)).to.deep.equal({ toCopy: ['order-shipped', 'hello-world'], skipped: [] });
      expect(notificationTemplateRepository.find.secondCall.args[0]).to.deep.equal({
        _environmentId: 'dev_env',
        _organizationId: 'target_org',
        'triggers.identifier': { $in: ['order-shipped', 'hello-world'] },
      });
    });

    it('skips hello-world when the target already has it', async () => {
      const { usecase, notificationTemplateRepository } = setup();
      notificationTemplateRepository.find.onFirstCall().resolves([template('order-shipped'), template('hello-world')]);
      notificationTemplateRepository.find.onSecondCall().resolves([template('hello-world')]);

      expect(await usecase.preflight(scope)).to.deep.equal({ toCopy: ['order-shipped'], skipped: ['hello-world'] });
    });

    it('skips workflows that were not built in the dashboard', async () => {
      const { usecase, notificationTemplateRepository } = setup();
      notificationTemplateRepository.find
        .onFirstCall()
        .resolves([template('order-shipped'), template('code-first', ResourceOriginEnum.EXTERNAL)]);

      expect(await usecase.preflight(scope)).to.deep.equal({ toCopy: ['order-shipped'], skipped: ['code-first'] });
    });

    it('refuses with claim_workflow_exists listing every other clashing identifier', async () => {
      const { usecase, notificationTemplateRepository } = setup();
      notificationTemplateRepository.find
        .onFirstCall()
        .resolves([template('order-shipped'), template('welcome'), template('hello-world')]);
      notificationTemplateRepository.find
        .onSecondCall()
        .resolves([template('welcome'), template('order-shipped'), template('hello-world')]);

      const error = await usecase.preflight(scope).catch((caught) => caught);

      expect(error).to.be.instanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).to.deep.equal({
        message:
          'Your Development environment already has workflows with these identifiers: order-shipped, welcome. Rename or delete them, then open the link again.',
        code: 'claim_workflow_exists',
        workflowIdentifiers: ['order-shipped', 'welcome'],
      });
    });

    it('does not query the target when the keyless environment has no workflows', async () => {
      const { usecase, notificationTemplateRepository } = setup();

      expect(await usecase.preflight(scope)).to.deep.equal({ toCopy: [], skipped: [] });
      expect(notificationTemplateRepository.find.calledOnce).to.equal(true);
    });
  });

  describe('copy', () => {
    it('reads from the keyless environment and upserts into the target as the claimer, keeping the identifier', async () => {
      const { usecase, getWorkflowUseCase, upsertWorkflowUseCase } = setup();

      const result = await usecase.copy({ ...scope, user: claimer, workflowIds: ['order-shipped'] });

      expect(result).to.deep.equal({
        copiedInternalIds: ['copy_of_order-shipped'],
        copied: ['order-shipped'],
        skipped: [],
      });
      expect(getWorkflowUseCase.execute.firstCall.args[0].user).to.include({
        _id: 'claimer',
        organizationId: 'keyless_org',
        environmentId: 'keyless_env',
      });
      const upsert = upsertWorkflowUseCase.execute.firstCall.args[0];
      expect(upsert.preserveWorkflowId).to.equal(true);
      expect(upsert.workflowIdOrInternalId).to.equal(undefined);
      expect(upsert.user).to.include({ _id: 'claimer', organizationId: 'target_org', environmentId: 'dev_env' });
      expect(upsert.workflowDto.workflowId).to.equal('order-shipped');
      expect(upsert.workflowDto.origin).to.equal(ResourceOriginEnum.NOVU_CLOUD);
      expect(upsert.workflowDto.preferences.workflow).to.deep.equal({
        all: { enabled: true, readOnly: false },
        channels: {},
      });
    });

    it('drops the keyless layout from email steps so the target default layout applies', async () => {
      const { usecase, upsertWorkflowUseCase } = setup();

      await usecase.copy({ ...scope, user: claimer, workflowIds: ['order-shipped'] });

      const [emailStep, inAppStep] = upsertWorkflowUseCase.execute.firstCall.args[0].workflowDto.steps;
      expect(emailStep.controlValues).to.deep.equal({ subject: 'Hi' });
      expect(inAppStep.controlValues).to.deep.equal({ body: 'Hey' });
    });

    it('skips hello-world when copying it fails', async () => {
      const { usecase, upsertWorkflowUseCase, logger } = setup();
      upsertWorkflowUseCase.execute.onFirstCall().rejects(new Error('bridge workflow'));

      const result = await usecase.copy({ ...scope, user: claimer, workflowIds: ['hello-world', 'order-shipped'] });

      expect(result).to.deep.equal({
        copiedInternalIds: ['copy_of_order-shipped'],
        copied: ['order-shipped'],
        skipped: ['hello-world'],
      });
      expect(logger.warn.calledOnce).to.equal(true);
    });

    it('deletes the copies made so far and rethrows when any other workflow fails', async () => {
      const { usecase, upsertWorkflowUseCase, deleteWorkflowUseCase } = setup();
      const failure = new Error('workflow limit reached');
      upsertWorkflowUseCase.execute.onSecondCall().rejects(failure);

      const error = await usecase
        .copy({ ...scope, user: claimer, workflowIds: ['order-shipped', 'welcome'] })
        .catch((caught) => caught);

      expect(error).to.equal(failure);
      expect(deleteWorkflowUseCase.execute.calledOnce).to.equal(true);
      expect(deleteWorkflowUseCase.execute.firstCall.args[0]).to.include({
        userId: 'claimer',
        environmentId: 'dev_env',
        organizationId: 'target_org',
        workflowIdOrInternalId: 'copy_of_order-shipped',
      });
    });
  });

  describe('compensate', () => {
    it('deletes every copy and keeps going when one delete fails', async () => {
      const { usecase, deleteWorkflowUseCase, logger } = setup();
      deleteWorkflowUseCase.execute.onFirstCall().rejects(new Error('gone'));

      await usecase.compensate({
        user: claimer,
        targetEnvironmentId: 'dev_env',
        targetOrganizationId: 'target_org',
        copiedInternalIds: ['a', 'b'],
      });

      expect(deleteWorkflowUseCase.execute.callCount).to.equal(2);
      expect(deleteWorkflowUseCase.execute.secondCall.args[0].workflowIdOrInternalId).to.equal('b');
      expect(logger.error.calledOnce).to.equal(true);
    });
  });
});
