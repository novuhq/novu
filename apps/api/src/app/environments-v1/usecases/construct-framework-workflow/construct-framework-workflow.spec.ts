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
  constructProviderOverrideStepOptions: (...args: unknown[]) => StepOptions;
};

const staticStep = {
  template: { type: StepTypeEnum.CHAT, controls: { schema: { type: 'object', properties: { body: {} } } } },
} as unknown as NotificationStepEntity;

const dbWorkflow = { origin: ResourceOriginEnum.NOVU_CLOUD } as NotificationTemplateEntity;

function buildOptions(stepType: StepTypeEnum, providerIds: readonly string[]): StepOptions {
  return usecase.constructProviderOverrideStepOptions(staticStep, {}, dbWorkflow, stepType, providerIds);
}

describe('ConstructFrameworkWorkflow provider override step options', () => {
  it('registers a resolver for every chat provider that supports content overrides', () => {
    const { providers } = buildOptions(StepTypeEnum.CHAT, CHAT_CONTENT_OVERRIDE_PROVIDER_IDS);

    expect(Object.keys(providers).sort()).to.deep.equal([...CHAT_CONTENT_OVERRIDE_PROVIDER_IDS].sort());
  });

  it('still registers a resolver for every tool provider', () => {
    const { providers } = buildOptions(StepTypeEnum.TOOL, TOOL_CONTENT_OVERRIDE_PROVIDER_IDS);

    expect(Object.keys(providers).sort()).to.deep.equal([...TOOL_CONTENT_OVERRIDE_PROVIDER_IDS].sort());
  });

  it('resolves a provider payload from the compiled overrides on the step outputs', async () => {
    const { providers } = buildOptions(StepTypeEnum.CHAT, CHAT_CONTENT_OVERRIDE_PROVIDER_IDS);
    const outputs = { body: 'hi', providerOverrides: { [ChatProviderIdEnum.Slack]: { text: 'compiled' } } };

    expect(await providers[ChatProviderIdEnum.Slack]({ outputs })).to.deep.equal({ text: 'compiled' });
    expect(await providers[ChatProviderIdEnum.Discord]({ outputs })).to.deep.equal({});
  });

  it('extends the runtime control schema so the stitched providerOverrides field survives validation', () => {
    for (const [stepType, providerIds] of [
      [StepTypeEnum.CHAT, CHAT_CONTENT_OVERRIDE_PROVIDER_IDS],
      [StepTypeEnum.TOOL, TOOL_CONTENT_OVERRIDE_PROVIDER_IDS],
    ] as const) {
      const { controlSchema } = buildOptions(stepType, providerIds);

      expect(controlSchema.properties?.providerOverrides).to.deep.equal({
        type: 'object',
        additionalProperties: { type: 'object', additionalProperties: true },
      });
    }
  });

  it('keeps tool overrides addressable by their own provider ids', async () => {
    const { providers } = buildOptions(StepTypeEnum.TOOL, TOOL_CONTENT_OVERRIDE_PROVIDER_IDS);
    const outputs = { body: 'hi', providerOverrides: { [ToolProviderIdEnum.PagerDuty]: { severity: 'warning' } } };

    expect(await providers[ToolProviderIdEnum.PagerDuty]({ outputs })).to.deep.equal({ severity: 'warning' });
  });
});
