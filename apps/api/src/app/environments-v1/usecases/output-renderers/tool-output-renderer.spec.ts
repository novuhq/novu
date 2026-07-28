import { ModuleRef } from '@nestjs/core';
import { PinoLogger } from '@novu/application-generic';
import { NotificationTemplateEntity } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';
import { FullPayloadForRender } from './render-command';
import { ToolOutputRendererCommand, ToolOutputRendererUsecase } from './tool-output-renderer.usecase';

function buildUsecase(translatedControls: Record<string, unknown>) {
  const usecase = new ToolOutputRendererUsecase(
    sinon.createStubInstance(ModuleRef),
    sinon.createStubInstance(PinoLogger)
  );
  const processTranslations = sinon
    .stub(usecase as never as { processTranslations: unknown }, 'processTranslations')
    .resolves(translatedControls);

  return { usecase, processTranslations };
}

function buildCommand(controlValues: Record<string, unknown>): ToolOutputRendererCommand {
  return {
    controlValues,
    fullPayloadForRender: {} as FullPayloadForRender,
    dbWorkflow: { _environmentId: 'env', _organizationId: 'org', _id: 'wf' } as NotificationTemplateEntity,
  } as ToolOutputRendererCommand;
}

describe('ToolOutputRendererUsecase', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('returns only body and does not translate providerOverrides', async () => {
    const providerOverrides = { pagerduty: { severity: 'critical' } };
    const { usecase, processTranslations } = buildUsecase({ body: 'translated-body' });

    const output = await usecase.execute(buildCommand({ body: 'hello', providerOverrides, skip: false }));

    expect(output).to.deep.equal({ body: 'translated-body' });
    expect(processTranslations.firstCall.args[0].controls).to.deep.equal({ body: 'hello' });
  });

  it('returns body from translated controls when there are no providerOverrides', async () => {
    const { usecase } = buildUsecase({ body: 'translated-body' });

    const output = await usecase.execute(buildCommand({ body: 'hello' }));

    expect(output).to.deep.equal({ body: 'translated-body' });
  });
});
