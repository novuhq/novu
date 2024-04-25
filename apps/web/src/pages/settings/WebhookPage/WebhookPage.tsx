import { Button, Input, inputStyles } from '@novu/design-system';
import { FC } from 'react';
import { Controller } from 'react-hook-form';

import { ClipboardIconButton } from '../../../components';
import { Timeline } from '../../../components/Timeline';
import { css, cx } from '../../../styled-system/css';
import { HStack, Stack } from '../../../styled-system/jsx';
import { text } from '../../../styled-system/recipes';
import { SettingsPageContainer } from '../SettingsPageContainer';
import { Text } from './WebhookPage.shared';

// Unfortunately, a wrapper around TimelineItem prevented any styles from applying, so have to use direct import for now
import { Timeline as MantineTimeline } from '@mantine/core';
import { useWebhookPage } from './useWebhookPage';
import { WebhookClaimStatusDisplay } from './WebhookClaimStatusDisplay';
import { WebhookAdditionalInformationLink } from './WebhookAdditionalInformationLink';
import { useSettingsEnvRedirect } from '../useSettingsEnvRedirect';

const codeValueInputClassName = css({
  '& input': {
    border: 'none !important',
    background: 'surface.popover !important',
    color: 'typography.text.secondary !important',
    fontFamily: 'mono !important',
  },
});

// source: https://www.geeksforgeeks.org/how-to-validate-a-domain-name-using-regular-expression/
const DOMAIN_REGEX = /^(?!-)[A-Za-z0-9-]+([\-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/;

export const WebhookPage: FC = () => {
  // redirect user if an invalid env name is provided in the URL
  useSettingsEnvRedirect();

  const {
    claimStatus,
    handleCheckRecords,
    isMxRecordRefreshing,
    envName,
    handleDomainSubmit,
    mxRecordClipboard,
    mailServerDomain,
    domainControl,
    isUpdateDnsSettingsLoading,
    inboundParseDomain,
  } = useWebhookPage();

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
          <WebhookClaimStatusDisplay
            status={claimStatus}
            handleRefresh={handleCheckRecords}
            isLoading={isMxRecordRefreshing}
          />
        </Stack>
      }
    >
      <Stack gap="200" className={css({ maxW: '960px' })}>
        <Timeline>
          <MantineTimeline.Item
            bullet={1}
            lineVariant="dashed"
            title={<label htmlFor="inbound-parse-domain-input">Specify a domain name for {envName} environment</label>}
          >
            <form onSubmit={handleDomainSubmit}>
              <Controller
                control={domainControl}
                name="inboundParseDomain"
                rules={{
                  required: 'Required - Domain name',
                  pattern: {
                    value: DOMAIN_REGEX,
                    message: 'Identifier must be a valid domain name',
                  },
                }}
                render={({ field, fieldState }) => (
                  <HStack width={'100%'} className={css({ height: 'components.input.height', marginTop: '50' })}>
                    <Input
                      {...field}
                      id="inbound-parse-domain-input"
                      data-test-id="inbound-parse-domain-input"
                      value={field.value || ''}
                      placeholder="your.domain.com"
                      className={css({
                        flexGrow: 1,
                        // prevent layout shift when an error is shown
                        '& .mantine-TextInput-error': { position: 'absolute' },
                        '& .mantine-TextInput-wrapper': { mb: '0 !important' },
                      })}
                      error={fieldState.error?.message}
                    />
                    <Button
                      disabled={!field.value || field.value === inboundParseDomain}
                      className={css({ h: '100% !important' })}
                      loading={isUpdateDnsSettingsLoading}
                      submit
                    >
                      Save
                    </Button>
                  </HStack>
                )}
              />
            </form>
          </MantineTimeline.Item>
          <MantineTimeline.Item
            bullet={2}
            lineVariant="dashed"
            title={`Create a new MX record for ${envName} environment`}
          >
            <Text>
              Open MX Records page on your domain host's website. Create a new MX record for the {envName} environment
              for a subdomain you want to process incoming email. This hostname should be used exclusively to parse your
              incoming email, e.g. parse.example.com.
            </Text>
          </MantineTimeline.Item>
          <MantineTimeline.Item bullet={3} lineVariant="dashed" title="Assign MX record a priority">
            <Text mb="50">Assign MX record a priority of 10 and point it to the inbound mail server:</Text>
            <Input
              readOnly
              className={codeValueInputClassName}
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
              data-test-id="mail-server-domain"
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
        <WebhookAdditionalInformationLink />
      </Stack>
    </SettingsPageContainer>
  );
};
