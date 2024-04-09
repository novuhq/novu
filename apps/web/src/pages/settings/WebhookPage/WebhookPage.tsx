import { useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import {
  Button,
  colors,
  IconCheckCircle,
  IconOutlineMenuBook,
  IconWarningAmber,
  Input,
  inputStyles,
  INPUT_HEIGHT_PX,
} from '@novu/design-system';
import type { IResponseError } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { FC, useEffect, useState } from 'react';
import { Control, Controller, useForm } from 'react-hook-form';

import { updateDnsSettings } from '../../../api/environment';
import { validateMxRecord } from '../../../api/inbound-parse';
import { MAIL_SERVER_DOMAIN } from '../../../config';
import { useEffectOnce, useEnvController } from '../../../hooks';

import { ClipboardIconButton } from '../../../components';
import { Timeline } from '../../../components/Timeline';
import { css, cx } from '../../../styled-system/css';
import { HStack, Stack } from '../../../styled-system/jsx';
import { text } from '../../../styled-system/recipes';
import { SettingsPageContainer } from '../SettingsPageContainer';
import { Text } from './WebhookPage.shared';

// Unfortunately, a wrapper around TimelineItem prevented any styles from applying, so have to use direct import for now
import { Timeline as MantineTimeline } from '@mantine/core';
import { WebhookClaimStatusDisplay } from './WebhookClaimStatusDisplay';
import { WebhookClaimStatus } from './WebhookPage.types';

interface IWebhookPageProps {
  temp?: string;
}

export const WebhookPage: FC<IWebhookPageProps> = (props) => {
  const mailServerDomain = `10 ${MAIL_SERVER_DOMAIN}`;

  const mxRecordClipboard = useClipboard({ timeout: 1000 });
  const { readonly, environment, refetchEnvironment } = useEnvController();

  const [claimStatus, setClaimStatus] = useState<WebhookClaimStatus>('claimed');

  const { mutateAsync: updateDnsSettingsMutation, isLoading: isUpdateDnsSettingsLoading } = useMutation<
    { dns: { mxRecordConfigured: boolean; inboundParseDomain: string } },
    IResponseError,
    { payload: { inboundParseDomain: string | undefined }; environmentId: string }
  >(({ payload, environmentId }) => updateDnsSettings(payload, environmentId));

  const { setValue, handleSubmit, control } = useForm({
    defaultValues: {
      mxRecordConfigured: false,
      inboundParseDomain: '',
    },
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

  async function handleUpdateDnsSettings({ inboundParseDomain }) {
    const payload = {
      inboundParseDomain,
    };

    await updateDnsSettings(payload, environment?._id ?? '');

    showNotification({
      message: 'Domain info updated successfully',
      color: 'green',
    });
  }

  async function handleCheckRecords() {
    const record = await validateMxRecord();

    if (environment?.dns && record.mxRecordConfigured !== environment.dns.mxRecordConfigured) {
      await refetchEnvironment();
    }
  }

  return (
    <SettingsPageContainer
      title="Inbound parse webhook"
      header={
        <Stack gap="100" className={css({ maxW: '600px' })}>
          <div>
            <Text>
              A webhook that processes all incoming email for a domain or subdomain, parses the contents and
              attachments, and then POSTs multipart/form-data to a URL that you choose for each environment.
            </Text>
          </div>
          <WebhookClaimStatusDisplay status={claimStatus} />
        </Stack>
      }
    >
      <Stack gap="200" className={css({ maxW: '960px' })}>
        <form noValidate onSubmit={handleSubmit(handleUpdateDnsSettings)}>
          <Timeline>
            <MantineTimeline.Item bullet={1} lineVariant="dashed" title="Specify a domain name for Dev environment">
              {/* TODO: use a semantic token from the design system instead */}
              <Controller
                control={control}
                name="inboundParseDomain"
                render={({ field }) => (
                  <HStack
                    width={'100%'}
                    className={css({ height: `${INPUT_HEIGHT_PX}px !important`, marginTop: '50' })}
                  >
                    <Input
                      {...field}
                      data-test-id="inbound-parse-domain"
                      value={field.value || ''}
                      placeholder="Domain goes here..."
                      className={css({ flexGrow: 1 })}
                    />
                    <Button
                      disabled={!field.value}
                      variant={'outline'}
                      className={css({ h: '100% !important' })}
                      onClick={handleCheckRecords}
                    >
                      Save
                    </Button>
                  </HStack>
                )}
              />
            </MantineTimeline.Item>
            <MantineTimeline.Item bullet={2} lineVariant="dashed" title="Create a new MX record for dev environment">
              <Text>
                Open MX Records page on your domain host's website. Create a new MX record dev environment for a
                subdomain you want to process incoming email. This hostname should be used exclusively to parse your
                incoming email, e.g. parse.yourdomain.com.
              </Text>
            </MantineTimeline.Item>
            <MantineTimeline.Item bullet={3} lineVariant="dashed" title="Assign MX record a priority">
              <Text mb="50">Assign MX record a priority of 10 and point it to the inbound mail server:</Text>
              <Input
                readOnly
                // label={<Label control={control} />}
                className={css({
                  '& input': {
                    border: 'none !important',
                    background: 'surface.popover !important',
                    color: 'typography.text.secondary !important',
                    fontFamily: 'mono !important',
                  },
                })}
                styles={inputStyles}
                rightSection={
                  <ClipboardIconButton
                    isCopied={mxRecordClipboard.copied}
                    handleCopy={() => mxRecordClipboard.copy(mailServerDomain)}
                    testId={'mail-server-domain-copy'}
                    size={'16'}
                  />
                }
                value={mailServerDomain}
                data-test-id="mail-server-identifier"
              />
            </MantineTimeline.Item>
            <MantineTimeline.Item bullet={4} lineVariant="dashed" title="Enable parse and set webhook URL">
              <ul className={cx(text(), css({ color: 'typography.text.secondary', listStyleType: 'disc', pl: '100' }))}>
                <li>Edit email step in a Workflow.</li>
                <li>Enable the reply callbacks toggle.</li>
                <li>Set the Replay callback URL for the parsed data to be POSTed.</li>
              </ul>
            </MantineTimeline.Item>
          </Timeline>
        </form>
        <AdditionalInformationLink />
      </Stack>
    </SettingsPageContainer>
  );
};

function AdditionalInformationLink() {
  return (
    <a
      className={css({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '50',
      })}
      href="https://docs.novu.co/platform/inbound-parse-webhook"
      target="_blank"
      rel="noreferrer noopener"
    >
      <IconOutlineMenuBook />
      <Text>Learn about inbound parse webhook</Text>
    </a>
  );
}
