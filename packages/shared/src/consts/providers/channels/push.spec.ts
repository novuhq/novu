import { describe, expect, test } from 'vitest';
import { PushProviderIdEnum } from '../../../types';
import { pushProviders } from './push';

// AppIO delivers into the government IO app, so customers cannot report push activity back to Novu.
const PROVIDERS_WITHOUT_ACTIVITY_TRACKING = [PushProviderIdEnum.AppIO];

describe('pushProviders inbound webhook configuration', () => {
  test.each(Object.values(PushProviderIdEnum).filter((id) => !PROVIDERS_WITHOUT_ACTIVITY_TRACKING.includes(id)))(
    '%s exposes the Push Activity Tracking inboundWebhook group',
    (providerId) => {
      const provider = pushProviders.find((entry) => entry.id === providerId);

      expect(provider, `missing provider config for ${providerId}`).toBeDefined();

      const inboundWebhookGroup = provider?.configurations?.find((group) => group.groupType === 'inboundWebhook');

      expect(inboundWebhookGroup, `${providerId} should show Push Activity Tracking`).toBeDefined();
      expect(inboundWebhookGroup?.enabler).toBe('inboundWebhookEnabled');
      expect(inboundWebhookGroup?.configurations.some((config) => config.key === 'inboundWebhookEnabled')).toBe(true);
    }
  );

  test.each(PROVIDERS_WITHOUT_ACTIVITY_TRACKING)('%s does not expose Push Activity Tracking', (providerId) => {
    const provider = pushProviders.find((entry) => entry.id === providerId);

    expect(provider?.configurations?.find((group) => group.groupType === 'inboundWebhook')).toBeUndefined();
  });
});
