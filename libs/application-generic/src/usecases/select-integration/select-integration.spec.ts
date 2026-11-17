import {
  EnvironmentRepository,
  ExecutionDetailsRepository,
  IntegrationEntity,
  IntegrationRepository,
  JobRepository,
  MessageRepository,
  SubscriberRepository,
  TenantRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  FieldLogicalOperatorEnum,
  FieldOperatorEnum,
  FilterPartTypeEnum,
} from '@novu/shared';
import { FeatureFlagsService, TraceLogRepository } from '../../services';
import { CompileTemplate } from '../compile-template';
import { ConditionsFilter } from '../conditions-filter';
import { CreateExecutionDetails } from '../create-execution-details';
import { SelectIntegrationCommand } from './select-integration.command';
import { SelectIntegration } from './select-integration.usecase';

const testIntegration: IntegrationEntity = {
  _environmentId: 'env-test-123',
  _id: 'integration-test-123',
  _organizationId: 'org-test-123',
  active: true,
  channel: ChannelTypeEnum.EMAIL,
  credentials: {
    apiKey: '123',
    user: 'test-user',
    secretKey: '123',
    domain: 'domain',
    password: '123',
    host: 'host',
    port: 'port',
    secure: true,
    region: 'region',
    accountSid: 'accountSid',
    messageProfileId: 'messageProfileId',
    token: '123',
    from: 'from',
    senderName: 'senderName',
    applicationId: 'applicationId',
    clientId: 'clientId',
    projectName: 'projectName',
  },
  providerId: 'test-provider-id',
  deleted: false,
  identifier: 'test-integration-identifier',
  name: 'test-integration-name',
  primary: true,
  priority: 1,
  deletedAt: null,
  deletedBy: null,
};

const findOneMock = vi.fn(() => testIntegration);
const findMock = vi.fn(() => []);

vi.mock('@novu/dal', async () => ({
  ...(await vi.importActual('@novu/dal')),
  IntegrationRepository: vi.fn(function () {
    return {
      findOne: findOneMock,
      find: findMock,
    };
  }),
}));

describe('select integration', () => {
  let useCase: SelectIntegration;
  const integrationRepository: IntegrationRepository = new IntegrationRepository();

  const conditionsFilter = new ConditionsFilter(
    new SubscriberRepository(),
    new MessageRepository(),
    new JobRepository(),
    new EnvironmentRepository(),
    new CreateExecutionDetails(new ExecutionDetailsRepository(), TraceLogRepository as any, new FeatureFlagsService()),
    new CompileTemplate(),
    new FeatureFlagsService(),
    { setContext: vi.fn(), info: vi.fn() } as any
  );
  beforeEach(async () => {
    vi.clearAllMocks();
    findMock.mockReturnValue([]);
    findOneMock.mockReturnValue(testIntegration);

    const featureFlagsService = {
      getFlag: vi.fn().mockResolvedValue(false),
    };
    const normalizeVariablesUsecase = {
      execute: vi.fn().mockResolvedValue({}),
    };
    useCase = new SelectIntegration(
      integrationRepository,
      conditionsFilter,
      new TenantRepository(),
      normalizeVariablesUsecase as never,
      featureFlagsService as never
    );
  });

  it('does not select an Agent Email Inbox integration for a workflow', async () => {
    findOneMock.mockReturnValue({
      ...testIntegration,
      providerId: EmailProviderIdEnum.AgentEmailInbox,
      identifier: 'agent-email-inbox-id',
    });

    const integration = await useCase.execute(
      SelectIntegrationCommand.create({
        channelType: ChannelTypeEnum.EMAIL,
        environmentId: 'environmentId',
        organizationId: 'organizationId',
        userId: 'userId',
        filterData: {},
      })
    );

    expect(integration).toBeUndefined();
  });

  it('should select the integration', async () => {
    const integration = await useCase.execute(
      SelectIntegrationCommand.create({
        channelType: ChannelTypeEnum.EMAIL,
        environmentId: 'environmentId',
        organizationId: 'organizationId',
        userId: 'userId',
        filterData: {},
      })
    );

    expect(integration).not.toBeNull();
    expect(integration?.integration.identifier).toEqual(testIntegration.identifier);
  });

  it('should return undefined when no integration is found', async () => {
    findOneMock.mockImplementationOnce(() => null);

    const integration = await useCase.execute(
      SelectIntegrationCommand.create({
        channelType: ChannelTypeEnum.EMAIL,
        environmentId: 'environmentId',
        organizationId: 'organizationId',
        userId: 'userId',
        filterData: {},
      })
    );

    expect(integration).toBeUndefined();
  });

  it.each`
    channel                   | shouldUsePrimary
    ${ChannelTypeEnum.PUSH}   | ${false}
    ${ChannelTypeEnum.CHAT}   | ${false}
    ${ChannelTypeEnum.IN_APP} | ${false}
    ${ChannelTypeEnum.EMAIL}  | ${true}
    ${ChannelTypeEnum.SMS}    | ${true}
  `(
    'for channel $channel it should select integration by primary: $shouldUsePrimary',
    async ({ channel, shouldUsePrimary }) => {
      const environmentId = 'environmentId';
      const organizationId = 'organizationId';
      const userId = 'userId';
      findOneMock.mockImplementation(() => ({
        ...testIntegration,
        channel,
      }));

      await useCase.execute(
        SelectIntegrationCommand.create({
          channelType: channel,
          environmentId,
          organizationId,
          userId,
          filterData: {},
        })
      );

      expect(findOneMock).toHaveBeenCalledWith(
        {
          _organizationId: organizationId,
          _environmentId: environmentId,
          channel,
          active: true,
          ...(shouldUsePrimary && {
            primary: true,
          }),
        },
        undefined,
        { query: { sort: { createdAt: -1 } } }
      );
    }
  );

  it('should scope identifier override query to the current environment', async () => {
    const environmentId = 'dev-env-id';
    const organizationId = 'organizationId';
    const userId = 'userId';
    const identifier = 'prod-integration-identifier';

    findOneMock.mockImplementationOnce(() => null);

    const integration = await useCase.execute(
      SelectIntegrationCommand.create({
        channelType: ChannelTypeEnum.EMAIL,
        environmentId,
        organizationId,
        userId,
        identifier,
        filterData: {},
      })
    );

    expect(findOneMock).toHaveBeenCalledWith(
      {
        _organizationId: organizationId,
        _environmentId: environmentId,
        channel: ChannelTypeEnum.EMAIL,
        identifier,
        active: true,
      },
      undefined,
      { query: { sort: { createdAt: -1 } } }
    );
    expect(integration).toBeUndefined();
  });

  it('should return integration when identifier belongs to the same environment', async () => {
    const environmentId = 'dev-env-id';
    const organizationId = 'organizationId';
    const userId = 'userId';
    const identifier = 'dev-integration-identifier';

    findOneMock.mockImplementationOnce(() => ({
      ...testIntegration,
      _environmentId: environmentId,
      identifier,
    }));

    const integration = await useCase.execute(
      SelectIntegrationCommand.create({
        channelType: ChannelTypeEnum.EMAIL,
        environmentId,
        organizationId,
        userId,
        identifier,
        filterData: {},
      })
    );

    expect(findOneMock).toHaveBeenCalledWith(
      {
        _organizationId: organizationId,
        _environmentId: environmentId,
        channel: ChannelTypeEnum.EMAIL,
        identifier,
        active: true,
      },
      undefined,
      { query: { sort: { createdAt: -1 } } }
    );
    expect(integration).not.toBeUndefined();
    expect(integration?.integration.identifier).toEqual(identifier);
  });

  it('should select the first integration matching JsonLogic conditions', async () => {
    const matchingIntegration: IntegrationEntity = {
      ...testIntegration,
      _id: 'conditioned-integration',
      identifier: 'conditioned-integration-identifier',
      primary: false,
      rules: {
        '==': [{ var: 'subscriber.locale' }, 'fr'],
      },
    };

    findOneMock.mockReturnValue(testIntegration);
    findMock.mockReturnValue([matchingIntegration]);

    const integration = await useCase.execute(
      SelectIntegrationCommand.create({
        channelType: ChannelTypeEnum.EMAIL,
        environmentId: 'environmentId',
        organizationId: 'organizationId',
        userId: 'userId',
        filterData: {
          subscriber: { locale: 'fr' },
        },
      })
    );

    expect(integration?.integration.identifier).toEqual(matchingIntegration.identifier);
    expect(integration?.matchedConditions).toEqual({ type: 'rules', value: matchingIntegration.rules });
  });

  it('should select an integration matching saved payload conditions', async () => {
    const matchingIntegration: IntegrationEntity = {
      ...testIntegration,
      _id: 'payload-conditioned-integration',
      identifier: 'payload-conditioned-integration-identifier',
      primary: false,
      rules: {
        '==': [{ var: 'payload.region' }, 'eu'],
      },
    };

    findOneMock.mockReturnValue(testIntegration);
    findMock.mockReturnValue([matchingIntegration]);

    const integration = await useCase.execute(
      SelectIntegrationCommand.create({
        channelType: ChannelTypeEnum.EMAIL,
        environmentId: 'environmentId',
        organizationId: 'organizationId',
        userId: 'userId',
        filterData: {
          payload: { region: 'eu' },
        },
      })
    );

    expect(integration?.integration.identifier).toEqual(matchingIntegration.identifier);
    expect(integration?.matchedConditions).toEqual({ type: 'rules', value: matchingIntegration.rules });
  });

  it('should select an integration matching workflow metadata conditions', async () => {
    const matchingIntegration: IntegrationEntity = {
      ...testIntegration,
      _id: 'workflow-conditioned-integration',
      identifier: 'workflow-conditioned-integration-identifier',
      primary: false,
      rules: {
        '==': [{ var: 'workflow.name' }, 'Order confirmation'],
      },
    };

    findOneMock.mockReturnValue(testIntegration);
    findMock.mockReturnValue([matchingIntegration]);

    const integration = await useCase.execute(
      SelectIntegrationCommand.create({
        channelType: ChannelTypeEnum.EMAIL,
        environmentId: 'environmentId',
        organizationId: 'organizationId',
        userId: 'userId',
        filterData: {
          workflow: {
            name: 'Order confirmation',
            tags: ['transactional'],
          },
        },
      })
    );

    expect(integration?.integration.identifier).toEqual(matchingIntegration.identifier);
    expect(integration?.matchedConditions).toEqual({ type: 'rules', value: matchingIntegration.rules });
  });

  it('should not apply unsafe json-logic operators and fall back to primary', async () => {
    const unsafeIntegration: IntegrationEntity = {
      ...testIntegration,
      _id: 'unsafe-integration',
      identifier: 'unsafe-integration-identifier',
      primary: false,
      rules: {
        log: { var: 'subscriber.email' },
      },
    };

    findOneMock.mockReturnValue(testIntegration);
    findMock.mockReturnValue([unsafeIntegration]);

    const integration = await useCase.execute(
      SelectIntegrationCommand.create({
        channelType: ChannelTypeEnum.EMAIL,
        environmentId: 'environmentId',
        organizationId: 'organizationId',
        userId: 'userId',
        filterData: {
          subscriber: { email: 'secret@example.com' },
        },
      })
    );

    expect(integration?.integration.identifier).toEqual(testIntegration.identifier);
  });

  it('should fall back to primary when JsonLogic conditions do not match', async () => {
    const matchingIntegration: IntegrationEntity = {
      ...testIntegration,
      _id: 'conditioned-integration',
      identifier: 'conditioned-integration-identifier',
      primary: false,
      rules: {
        '==': [{ var: 'context.tenant.id' }, 'acme'],
      },
    };

    findOneMock.mockReturnValue(testIntegration);
    findMock.mockReturnValue([matchingIntegration]);

    const integration = await useCase.execute(
      SelectIntegrationCommand.create({
        channelType: ChannelTypeEnum.EMAIL,
        environmentId: 'environmentId',
        organizationId: 'organizationId',
        userId: 'userId',
        filterData: {
          context: { tenant: { id: 'other' } },
        },
      })
    );

    expect(integration?.integration.identifier).toEqual(testIntegration.identifier);
  });

  it('queries only conditioned integrations when no identifier is provided', async () => {
    await useCase.execute(
      SelectIntegrationCommand.create({
        channelType: ChannelTypeEnum.EMAIL,
        environmentId: 'environmentId',
        organizationId: 'organizationId',
        userId: 'userId',
        filterData: {},
      })
    );

    expect(findMock).toHaveBeenCalledWith(
      {
        _organizationId: 'organizationId',
        _environmentId: 'environmentId',
        channel: ChannelTypeEnum.EMAIL,
        active: true,
        $or: [{ rules: { $type: 'object' } }, { 'conditions.0': { $exists: true } }],
      },
      '',
      { sort: { priority: -1, createdAt: -1 } }
    );
    expect(findOneMock).toHaveBeenCalled();
  });

  it('does not scan conditioned integrations when identifier is provided', async () => {
    await useCase.execute(
      SelectIntegrationCommand.create({
        channelType: ChannelTypeEnum.EMAIL,
        environmentId: 'environmentId',
        organizationId: 'organizationId',
        userId: 'userId',
        identifier: 'test-integration-identifier',
        filterData: {},
      })
    );

    expect(findMock).not.toHaveBeenCalled();
  });

  it('selects the first matching integration in priority then createdAt order', async () => {
    const firstMatch: IntegrationEntity = {
      ...testIntegration,
      _id: 'first-match',
      identifier: 'first-match-identifier',
      primary: false,
      priority: 5,
      rules: {
        '==': [{ var: 'subscriber.locale' }, 'fr'],
      },
    };
    const secondMatch: IntegrationEntity = {
      ...testIntegration,
      _id: 'second-match',
      identifier: 'second-match-identifier',
      primary: false,
      priority: 1,
      rules: {
        '==': [{ var: 'subscriber.locale' }, 'fr'],
      },
    };

    findOneMock.mockReturnValue(testIntegration);
    findMock.mockReturnValue([firstMatch, secondMatch]);

    const integration = await useCase.execute(
      SelectIntegrationCommand.create({
        channelType: ChannelTypeEnum.EMAIL,
        environmentId: 'environmentId',
        organizationId: 'organizationId',
        userId: 'userId',
        filterData: {
          subscriber: { locale: 'fr' },
        },
      })
    );

    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: [{ rules: { $type: 'object' } }, { 'conditions.0': { $exists: true } }],
      }),
      '',
      { sort: { priority: -1, createdAt: -1 } }
    );
    expect(integration?.integration.identifier).toEqual(firstMatch.identifier);
  });

  it('prefers rules over contradictory legacy conditions', async () => {
    const dualFormatIntegration: IntegrationEntity = {
      ...testIntegration,
      _id: 'dual-format',
      identifier: 'dual-format-identifier',
      primary: false,
      rules: {
        '==': [{ var: 'subscriber.locale' }, 'fr'],
      },
      conditions: [
        {
          value: FieldLogicalOperatorEnum.AND,
          children: [
            {
              field: 'locale',
              value: 'de',
              operator: FieldOperatorEnum.EQUAL,
              on: FilterPartTypeEnum.SUBSCRIBER,
            },
          ],
        },
      ],
    };

    findOneMock.mockReturnValue(testIntegration);
    findMock.mockReturnValue([dualFormatIntegration]);

    const ignoredLegacy = await useCase.execute(
      SelectIntegrationCommand.create({
        channelType: ChannelTypeEnum.EMAIL,
        environmentId: 'environmentId',
        organizationId: 'organizationId',
        userId: 'userId',
        filterData: {
          subscriber: { locale: 'de' },
        },
      })
    );

    expect(ignoredLegacy?.integration.identifier).toEqual(testIntegration.identifier);

    const matchedRules = await useCase.execute(
      SelectIntegrationCommand.create({
        channelType: ChannelTypeEnum.EMAIL,
        environmentId: 'environmentId',
        organizationId: 'organizationId',
        userId: 'userId',
        filterData: {
          subscriber: { locale: 'fr' },
        },
      })
    );

    expect(matchedRules?.integration.identifier).toEqual(dualFormatIntegration.identifier);
    expect(matchedRules?.matchedConditions).toEqual({ type: 'rules', value: dualFormatIntegration.rules });
  });
});

describe('select integration from the cached channel list', () => {
  const integrationRepository: IntegrationRepository = new IntegrationRepository();
  const cacheGetMock = vi.fn((_store: string, _key: string, fetchFn: () => Promise<unknown>) => fetchFn());

  const buildUseCase = () =>
    new SelectIntegration(
      integrationRepository,
      {} as never,
      new TenantRepository(),
      { execute: vi.fn().mockResolvedValue({}) } as never,
      { getFlag: vi.fn().mockResolvedValue(false) } as never,
      { get: cacheGetMock } as never
    );

  const select = (overrides: Partial<SelectIntegrationCommand> = {}) =>
    buildUseCase().execute(
      SelectIntegrationCommand.create({
        channelType: ChannelTypeEnum.SMS,
        environmentId: 'environmentId',
        organizationId: 'organizationId',
        userId: 'userId',
        filterData: {},
        useCache: true,
        ...overrides,
      })
    );

  const integration = (fields: Partial<IntegrationEntity> & { createdAt?: string }): IntegrationEntity =>
    ({ ...testIntegration, channel: ChannelTypeEnum.SMS, primary: false, ...fields }) as IntegrationEntity;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the channel integrations with one query and no findOne', async () => {
    findMock.mockReturnValue([integration({ _id: 'primary', identifier: 'primary', primary: true })]);

    const result = await select();

    expect(result?.integration.identifier).toEqual('primary');
    expect(findOneMock).not.toHaveBeenCalled();
    expect(findMock).toHaveBeenCalledTimes(1);
    expect(findMock).toHaveBeenCalledWith(
      {
        _organizationId: 'organizationId',
        _environmentId: 'environmentId',
        channel: ChannelTypeEnum.SMS,
        active: true,
      },
      '',
      { sort: { createdAt: -1 } }
    );
    expect(cacheGetMock).toHaveBeenCalledWith(
      'channel-integrations',
      'organizationId:environmentId:sms',
      expect.any(Function),
      { environmentId: 'environmentId', organizationId: 'organizationId' }
    );
  });

  it('picks the primary integration, not the newest non-primary one', async () => {
    findMock.mockReturnValue([
      integration({ _id: 'newest', identifier: 'newest' }),
      integration({ _id: 'primary', identifier: 'primary', primary: true }),
    ]);

    const result = await select();

    expect(result?.integration.identifier).toEqual('primary');
  });

  it('picks the newest integration for channels without a primary', async () => {
    findMock.mockReturnValue([
      integration({ _id: 'newest', identifier: 'newest', channel: ChannelTypeEnum.PUSH }),
      integration({ _id: 'older', identifier: 'older', channel: ChannelTypeEnum.PUSH }),
    ]);

    const result = await select({ channelType: ChannelTypeEnum.PUSH });

    expect(result?.integration.identifier).toEqual('newest');
  });

  it('selects by identifier among all active integrations', async () => {
    findMock.mockReturnValue([
      integration({ _id: 'primary', identifier: 'primary', primary: true }),
      integration({
        _id: 'override',
        identifier: 'override',
        rules: { '==': [{ var: 'subscriber.locale' }, 'fr'] },
      }),
    ]);

    const result = await select({ identifier: 'override', filterData: { subscriber: { locale: 'de' } } });

    expect(result?.integration.identifier).toEqual('override');
    expect(result?.matchedConditions).toBeUndefined();
  });

  it('returns undefined when the identifier is not active', async () => {
    findMock.mockReturnValue([integration({ _id: 'primary', identifier: 'primary', primary: true })]);

    const result = await select({ identifier: 'missing' });

    expect(result).toBeUndefined();
  });

  it('selects the first matching conditioned integration by priority then newest', async () => {
    const rules = { '==': [{ var: 'subscriber.locale' }, 'fr'] };
    findMock.mockReturnValue([
      integration({ _id: 'primary', identifier: 'primary', primary: true }),
      integration({ _id: 'low', identifier: 'low', priority: 1, rules, createdAt: '2026-03-01' }),
      integration({ _id: 'high-old', identifier: 'high-old', priority: 5, rules, createdAt: '2026-01-01' }),
      integration({ _id: 'high-new', identifier: 'high-new', priority: 5, rules, createdAt: '2026-02-01' }),
    ]);

    const result = await select({ filterData: { subscriber: { locale: 'fr' } } });

    expect(result?.integration.identifier).toEqual('high-new');
    expect(result?.matchedConditions).toEqual({ type: 'rules', value: rules });
  });

  it('falls back to the primary when no conditioned integration matches', async () => {
    findMock.mockReturnValue([
      integration({ _id: 'primary', identifier: 'primary', primary: true }),
      integration({ _id: 'fr', identifier: 'fr', priority: 5, rules: { '==': [{ var: 'subscriber.locale' }, 'fr'] } }),
    ]);

    const result = await select({ filterData: { subscriber: { locale: 'de' } } });

    expect(result?.integration.identifier).toEqual('primary');
  });

  it('decrypts a copy so the cached entity keeps its stored credentials', async () => {
    const cached = integration({ _id: 'primary', identifier: 'primary', primary: true });
    const storedCredentials = cached.credentials;
    findMock.mockReturnValue([cached]);

    const result = await select();

    expect(result?.integration).not.toBe(cached);
    expect(cached.credentials).toBe(storedCredentials);
  });
});
