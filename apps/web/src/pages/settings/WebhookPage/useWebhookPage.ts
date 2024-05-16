import { useClipboard } from '@mantine/hooks';
import { successMessage, errorMessage } from '@novu/design-system';
import { IResponseError, checkIsResponseError } from '@novu/shared';
import { MAIL_SERVER_DOMAIN, useEnvController, updateDnsSettings } from '@novu/shared-web';
import { useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { validateMxRecord } from '../../../api/inbound-parse';
import { useEffectOnce } from '../../../hooks';
import { getWebhookClaimStatusFromEnvironment } from './getWebhookClaimStatusFromEnvironment';
import { WebhookClaimStatus } from './WebhookPage.types';

export const useWebhookPage = () => {
  const mailServerDomain = `10 ${MAIL_SERVER_DOMAIN}`;

  const [isMxRecordRefreshing, setIsMxRecordRefreshing] = useState<boolean>(false);
  const mxRecordClipboard = useClipboard({ timeout: 1000 });
  const { environment, refetchEnvironment } = useEnvController();

  const { mutateAsync: updateDnsSettingsMutation, isLoading: isUpdateDnsSettingsLoading } = useMutation<
    { dns: { mxRecordConfigured: boolean; inboundParseDomain: string } },
    IResponseError,
    { payload: { inboundParseDomain: string | undefined }; environmentId: string }
  >(async ({ payload, environmentId }) => {
    const updatedSettings = await updateDnsSettings(payload, environmentId);
    await refetchEnvironment();

    return updatedSettings;
  });

  const {
    setValue,
    handleSubmit,
    control: domainControl,
  } = useForm({
    defaultValues: {
      mxRecordConfigured: false,
      inboundParseDomain: '',
    },
    mode: 'onBlur',
    reValidateMode: 'onChange',
    shouldFocusError: true,
  });

  useEffect(() => {
    if (environment) {
      setValue('inboundParseDomain', environment.dns?.inboundParseDomain || '');
      setValue('mxRecordConfigured', environment.dns?.mxRecordConfigured || false);
    }
  }, [setValue, environment]);

  useEffectOnce(() => {
    handleCheckRecords();
  }, true);

  const claimStatus: WebhookClaimStatus = getWebhookClaimStatusFromEnvironment(environment?.dns);

  async function handleUpdateDnsSettings({ inboundParseDomain }) {
    const payload = {
      payload: { inboundParseDomain },
      environmentId: environment?._id ?? '',
    };

    await updateDnsSettingsMutation(payload);
    successMessage('Domain info updated successfully');
  }

  async function handleCheckRecords() {
    try {
      setIsMxRecordRefreshing(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const record = await validateMxRecord();

      if (environment?.dns && record.mxRecordConfigured !== environment.dns.mxRecordConfigured) {
        await refetchEnvironment();
      }
    } catch (err: unknown) {
      if (checkIsResponseError(err)) {
        errorMessage(err.message);
      }
    } finally {
      setIsMxRecordRefreshing(false);
    }
  }

  const envName = environment?.name || '';

  return {
    claimStatus,
    handleCheckRecords,
    isMxRecordRefreshing,
    envName,
    handleDomainSubmit: handleSubmit(handleUpdateDnsSettings),
    mxRecordClipboard,
    mailServerDomain,
    domainControl,
    isUpdateDnsSettingsLoading,
    inboundParseDomain: environment?.dns?.inboundParseDomain,
  };
};
