import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { AnalyticsService, FeatureFlagsService } from '../../services';
import { CalculateLimitNovuIntegration } from '../calculate-limit-novu-integration';
import { GetNovuProviderCredentialsCommand } from './get-novu-provider-credentials.command';
import { GetNovuProviderCredentials } from './get-novu-provider-credentials.usecase';

describe('GetNovuProviderCredentials', () => {
  const analyticsService = { track: vi.fn() };
  const calculateLimitNovuIntegration = { execute: vi.fn() };
  const userRepository = { findById: vi.fn() };
  const featureFlagService = { getFlag: vi.fn() };

  const useCase = new GetNovuProviderCredentials(
    analyticsService as unknown as AnalyticsService,
    calculateLimitNovuIntegration as unknown as CalculateLimitNovuIntegration,
    userRepository as never,
    featureFlagService as unknown as FeatureFlagsService
  );

  beforeEach(() => {
    vi.clearAllMocks();
    calculateLimitNovuIntegration.execute.mockResolvedValue({ limit: 300, count: 0 });
    featureFlagService.getFlag.mockResolvedValue(false);
    userRepository.findById.mockResolvedValue({ email: 'member@novu.co' });
  });

  it('rejects a different recipient when the caller requires a match, even if the feature flag is off', async () => {
    await expect(useCase.execute(buildCommand({ requireRecipientMatch: true }))).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it('allows the logged-in user when the caller requires a match', async () => {
    const credentials = await useCase.execute(
      buildCommand({ recipientEmail: 'member@novu.co', requireRecipientMatch: true })
    );

    expect(credentials.from).toBe('no-reply@novu.co');
  });

  it('rejects a shared-provider recipient when the logged-in user has no email and a match is required', async () => {
    userRepository.findById.mockResolvedValue({ email: undefined });

    await expect(
      useCase.execute(buildCommand({ recipientEmail: 'member@novu.co', requireRecipientMatch: true }))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps workflow sends open to other recipients when the feature flag is off', async () => {
    const credentials = await useCase.execute(buildCommand({ recipientEmail: 'subscriber@example.com' }));

    expect(credentials.from).toBe('no-reply@novu.co');
    expect(userRepository.findById).not.toHaveBeenCalled();
  });

  it('still rejects other recipients for workflow sends when the feature flag is on', async () => {
    featureFlagService.getFlag.mockResolvedValue(true);

    await expect(useCase.execute(buildCommand({ recipientEmail: 'subscriber@example.com' }))).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it('rejects a shared-provider send that has already reached the monthly cap', async () => {
    calculateLimitNovuIntegration.execute.mockResolvedValue({ limit: 300, count: 300 });

    await expect(useCase.execute(buildCommand({ recipientEmail: 'member@novu.co' }))).rejects.toBeInstanceOf(
      ConflictException
    );
  });
});

function buildCommand(overrides: Partial<GetNovuProviderCredentialsCommand> = {}): GetNovuProviderCredentialsCommand {
  return GetNovuProviderCredentialsCommand.create({
    environmentId: 'env-1',
    organizationId: 'org-1',
    userId: 'user-1',
    channelType: ChannelTypeEnum.EMAIL,
    providerId: EmailProviderIdEnum.Novu,
    recipientEmail: 'victim@example.com',
    ...overrides,
  });
}
