import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { patchSubscriber } from '@/api/subscribers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFetchSubscriber } from '@/hooks/use-fetch-subscriber';
import { PHONE_PATTERN } from '@/components/agents/whatsapp-setup-guide-utils';
import { QueryKeys } from '@/utils/query-keys';

type UseConnectSubscriberPhoneResult = {
  phone: string;
  setPhone: (value: string) => void;
  savedPhone: string;
  isPhoneSaved: boolean;
  isSaving: boolean;
  saveError: string | null;
  clearSaveError: () => void;
  handleSavePhone: () => Promise<void>;
};

export function useConnectSubscriberPhone(subscriberId: string): UseConnectSubscriberPhoneResult {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: subscriber } = useFetchSubscriber({
    subscriberId,
    options: { enabled: Boolean(subscriberId) },
  });

  const savedPhone = subscriber?.phone?.trim() ?? '';
  const isPhoneSaved = Boolean(savedPhone);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when subscriberId changes
  useEffect(() => {
    if (savedPhone) {
      setPhone(savedPhone);
    }
  }, [savedPhone, subscriberId]);

  const handleSavePhone = useCallback(async () => {
    if (!PHONE_PATTERN.test(phone.trim())) {
      setSaveError('Enter a phone number in international format, including the country code.');

      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');

      await patchSubscriber({
        environment,
        subscriberId,
        subscriber: { phone: phone.trim() },
      });

      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchSubscriber, environment._id, subscriberId],
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong saving your phone number.');
    } finally {
      setIsSaving(false);
    }
  }, [currentEnvironment, phone, queryClient, subscriberId]);

  return {
    phone,
    setPhone,
    savedPhone,
    isPhoneSaved,
    isSaving,
    saveError,
    clearSaveError: () => setSaveError(null),
    handleSavePhone,
  };
}
