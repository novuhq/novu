import { describe, expect, test } from 'vitest';
import { PushProviderIdEnum } from '../../../types';
import { pushProviders } from './push';

describe('pushProviders inbound webhook configuration', () => {
  test.each(Object.values(PushProviderIdEnum))(
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
});
