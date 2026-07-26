import { NotificationStepEntity, NotificationTemplateEntity } from '@novu/dal';
import {
  CHAT_CONTENT_OVERRIDE_PROVIDER_IDS,
  ChatProviderIdEnum,
  ResourceOriginEnum,
  StepTypeEnum,
  TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
  ToolProviderIdEnum,
} from '@novu/shared';
import { expect } from 'chai';
import { ConstructFrameworkWorkflow } from './construct-framework-workflow.usecase';

type StepOptions = {
  controlSchema: { properties?: Record<string, unknown> };
  providers: Record<string, (args: { outputs: unknown }) => Promise<unknown>>;
};

const usecase = Object.create(ConstructFrameworkWorkflow.prototype) as ConstructFrameworkWorkflow & {
  constructProviderOverrideStepOptions: (
    staticStep: NotificationStepEntity,
    fullPayloadForRender: unknown,
    dbWorkflow: NotificationTemplateEntity,
    stepType: StepTypeEnum
  ) => StepOptions;
};

const staticStep = {
  template: { type: StepTypeEnum.CHAT, controls: { schema: { type: 'object', properties: { body: {} } } } },
} as unknown as NotificationStepEntity;

const dbWorkflow = { origin: ResourceOriginEnum.NOVU_CLOUD } as NotificationTemplateEntity;

function buildOptions(stepType: StepTypeEnum): StepOptions {
  return usecase.constructProviderOverrideStepOptions(staticStep, {}, dbWorkflow, stepType);
}

describe('ConstructFrameworkWorkflow provider override step options', () => {
  it('gives a chat step exactly the chat providers, and no tool providers', () => {
    const { providers } = buildOptions(StepTypeEnum.CHAT);

    expect(Object.keys(providers).sort()).to.deep.equal([...CHAT_CONTENT_OVERRIDE_PROVIDER_IDS].sort());
    expect(providers[ToolProviderIdEnum.PagerDuty]).to.equal(undefined);
  });

  it('gives a tool step exactly the tool providers, and no chat providers', () => {
    const { providers } = buildOptions(StepTypeEnum.TOOL);

    expect(Object.keys(providers).sort()).to.deep.equal([...TOOL_CONTENT_OVERRIDE_PROVIDER_IDS].sort());
    expect(providers[ChatProviderIdEnum.Slack]).to.equal(undefined);
  });

  it('resolves a provider payload from the compiled overrides on the step outputs', async () => {
    const { providers } = buildOptions(StepTypeEnum.CHAT);
    const outputs = { body: 'hi', providerOverrides: { [ChatProviderIdEnum.Slack]: { text: 'compiled' } } };

    expect(await providers[ChatProviderIdEnum.Slack]({ outputs })).to.deep.equal({ text: 'compiled' });
  });

  it('resolves an empty payload for a provider the step has no override for', async () => {
    const { providers } = buildOptions(StepTypeEnum.CHAT);

    expect(await providers[ChatProviderIdEnum.Discord]({ outputs: { body: 'hi' } })).to.deep.equal({});
  });

  it('accepts the stitched providerOverrides field the framework would otherwise strip', () => {
    const { controlSchema } = buildOptions(StepTypeEnum.CHAT);
    const providerOverrides = controlSchema.properties?.providerOverrides as {
      additionalProperties?: { additionalProperties?: boolean };
    };

    expect(controlSchema.properties?.body, 'the step\u2019s own controls must survive').to.exist;
    expect(providerOverrides?.additionalProperties?.additionalProperties).to.equal(true);
  });
});
