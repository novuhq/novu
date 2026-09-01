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

const novuIntegration: IntegrationEntity = {
  _environmentId: 'env-test-123',
  _id: 'integration-test-novu-123',
  _organizationId: 'org-test-123',
  active: true,
  channel: ChannelTypeEnum.EMAIL,
  credentials: {},
  providerId: EmailProviderIdEnum.Novu,
  deleted: false,
  identifier: 'test-novu-integration-identifier',
  name: 'test-novu-integration-name',
  primary: true,
  priority: 1,
  deletedAt: null,
  deletedBy: null,
};

const findOneMock = jest.fn(() => testIntegration);
const findMock = jest.fn(() => []);

jest.mock('@novu/dal', () => ({
  ...jest.requireActual('@novu/dal'),
  IntegrationRepository: jest.fn(() => ({
    findOne: findOneMock,
    find: findMock,
  })),
}));

jest.mock('../get-decrypted-integrations', () => ({
  ...jest.requireActual('../get-decrypted-integrations'),
  GetDecryptedIntegrations: jest.fn(() => ({
    execute: jest.fn(() => novuIntegration),
  })),
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
    { setContext: jest.fn(), info: jest.fn() } as any
  );
  beforeEach(async () => {
    jest.clearAllMocks();
    findMock.mockReturnValue([]);
    findOneMock.mockReturnValue(testIntegration);

    const featureFlagsService = {
      getFlag: jest.fn().mockResolvedValue(false),
    };
    const normalizeVariablesUsecase = {
      execute: jest.fn().mockResolvedValue({}),
    };
    useCase = new SelectIntegration(
      integrationRepository,
      conditionsFilter,
      new TenantRepository(),
      normalizeVariablesUsecase as never,
      featureFlagsService as never
    );
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
    expect(integration?.identifier).toEqual(testIntegration.identifier);
  });

  it('should return the novu integration', async () => {
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

    expect(integration).not.toBeNull();
    expect(integration?.providerId).toEqual(EmailProviderIdEnum.Novu);
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

      const integration = await useCase.execute(
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
    expect(integration?.identifier).toEqual(identifier);
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

    expect(integration?.identifier).toEqual(matchingIntegration.identifier);
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

    expect(integration?.identifier).toEqual(testIntegration.identifier);
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

    expect(integration?.identifier).toEqual(testIntegration.identifier);
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
    expect(integration?.identifier).toEqual(firstMatch.identifier);
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

    expect(ignoredLegacy?.identifier).toEqual(testIntegration.identifier);

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

    expect(matchedRules?.identifier).toEqual(dualFormatIntegration.identifier);
  });
});
