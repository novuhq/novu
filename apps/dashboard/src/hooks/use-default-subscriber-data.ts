import { DEFAULT_LOCALE, SubscriberDto } from '@novu/shared';
import { useCallback } from 'react';

type PreviewSubscriberData = Partial<SubscriberDto>;

export function useDefaultSubscriberData(selectedLocale?: string, organizationDefaultLocale?: string) {
  return useCallback((): PreviewSubscriberData => {
    const defaultLocale = selectedLocale || organizationDefaultLocale || DEFAULT_LOCALE;
    return {
      subscriberId: '123456',
      firstName: 'John',
      lastName: 'Doe',
      email: 'user@example.com',
      phone: '+1234567890',
      avatar: 'https://example.com/avatar.png',
      locale: defaultLocale,
      timezone: 'America/New_York',
      data: {},
    };
  }, [selectedLocale, organizationDefaultLocale]);
}
