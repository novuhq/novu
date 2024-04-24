import { useMemo, useEffect, useState } from 'react';
import { Group, JsonInput, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useWatch } from 'react-hook-form';

import { useMutation } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import * as capitalize from 'lodash.capitalize';
import { useDisclosure } from '@mantine/hooks';
import { IUserEntity, INotificationTriggerVariable } from '@novu/shared';
import { Button, colors, inputStyles } from '@novu/design-system';

import { errorMessage, successMessage } from '../../../utils/notifications';
import { useAuthContext } from '../../../components/providers/AuthProvider';
import { getSubscriberValue, getPayloadValue } from './TriggerSnippetTabs';
import { testTrigger } from '../../../api/notification-templates';
import { ExecutionDetailsModalWrapper } from './ExecutionDetailsModalWrapper';
import { TriggerSegmentControl } from './TriggerSegmentControl';
import { WorkflowSidebar } from './WorkflowSidebar';
import { useSegment } from '@novu/shared-web';
import { useOnboardingExperiment } from '../../../hooks/useOnboardingExperiment';
import { OnBoardingAnalyticsEnum } from '../../quick-start/consts';

const makeToValue = (subscriberVariables: INotificationTriggerVariable[], currentUser?: IUserEntity) => {
  const subsVars = getSubscriberValue(
    subscriberVariables,
    (variable) =>
      (currentUser && currentUser[variable.name === 'subscriberId' ? '_id' : variable.name]) || '<REPLACE_WITH_DATA>'
  );

  return JSON.stringify(subsVars, null, 2);
};

const makePayloadValue = (variables: INotificationTriggerVariable[]) => {
  return JSON.stringify(getPayloadValue(variables), null, 2);
};

function subscriberExist(subscriberVariables: INotificationTriggerVariable[]) {
  return subscriberVariables?.some((variable) => variable.name === 'subscriberId');
}

export function TestWorkflow({ trigger }) {
  const [transactionId, setTransactionId] = useState<string>('');
  const { currentUser, currentOrganization } = useAuthContext();
  const { mutateAsync: triggerTestEvent, isLoading } = useMutation(testTrigger);
  const [executionModalOpened, { close: closeExecutionModal, open: openExecutionModal }] = useDisclosure(false);

  const tags = useWatch({ name: 'tags' });

  const segment = useSegment();
  const { isOnboardingExperimentEnabled } = useOnboardingExperiment();

  const tagsIncludesOnboarding = tags?.includes('onboarding') && isOnboardingExperimentEnabled;

  const subscriberVariables = useMemo(() => {
    if (trigger?.subscriberVariables && subscriberExist(trigger?.subscriberVariables)) {
      return [...(trigger?.subscriberVariables || [])];
    }

    return [{ name: 'subscriberId' }, ...(trigger?.subscriberVariables || [])];
  }, [trigger]);
  const variables = useMemo(() => [...(trigger?.variables || [])], [trigger]);
  const reservedVariables = useMemo(() => [...(trigger?.reservedVariables || [])], [trigger]);

  const overridesTrigger = '{\n\n}';

  function jsonValidator(value: string) {
    try {
      JSON.parse(value);
    } catch (e) {
      return 'Invalid JSON';
    }
  }

  const form = useForm({
    initialValues: {
      toValue: makeToValue(subscriberVariables, currentUser),
      payloadValue: makePayloadValue(variables) === '{}' ? '{\n\n}' : makePayloadValue(variables),
      snippetValue: reservedVariables.map((variable) => {
        return { ...variable, variables: makePayloadValue(variable.variables) };
      }),
      overridesValue: overridesTrigger,
    },
    validate: {
      toValue: jsonValidator,
      payloadValue: jsonValidator,
      overridesValue: jsonValidator,
    },
  });
  const { setValues } = form;

  useEffect(() => {
    setValues({ toValue: makeToValue(subscriberVariables, currentUser) });
  }, [setValues, subscriberVariables, currentUser]);

  const onTrigger = async ({ toValue, payloadValue, overridesValue, snippetValue }) => {
    const to = JSON.parse(toValue);
    const payload = JSON.parse(payloadValue);
    const overrides = JSON.parse(overridesValue);
    const snippet = snippetValue.reduce((acc, variable) => {
      acc[variable.type] = JSON.parse(variable.variables);

      return acc;
    }, {});

    try {
      const response = await triggerTestEvent({
        name: trigger?.identifier,
        to,
        payload: {
          ...payload,
          __source: 'test-workflow',
        },
        ...snippet,
        overrides,
      });

      setTransactionId(response.transactionId || '');
      successMessage('Template triggered successfully');
      openExecutionModal();
    } catch (e: any) {
      Sentry.captureException(e);
      errorMessage(e.message || 'Un-expected error occurred');
    }
  };

  return (
    <>
      <WorkflowSidebar title="Trigger">
        <Text color={colors.B60} mt={-16}>
          Test trigger as if you sent it from your API or implement it by copy/pasting it into the codebase of your
          application.
        </Text>
        <TriggerSegmentControl />
        <JsonInput
          data-test-id="test-trigger-to-param"
          formatOnBlur
          autosize
          styles={inputStyles}
          label="To"
          {...form.getInputProps('toValue')}
          minRows={3}
          validationError="Invalid JSON"
        />
        <JsonInput
          data-test-id="test-trigger-payload-param"
          formatOnBlur
          autosize
          styles={inputStyles}
          label="Payload"
          {...form.getInputProps('payloadValue')}
          minRows={3}
          validationError="Invalid JSON"
        />
        <JsonInput
          data-test-id="test-trigger-overrides-param"
          formatOnBlur
          autosize
          styles={inputStyles}
          label="Overrides (optional)"
          {...form.getInputProps('overridesValue')}
          minRows={3}
          validationError="Invalid JSON"
        />
        {form.values.snippetValue.map((variable, index) => (
          <JsonInput
            key={index}
            data-test-id="test-trigger-overrides-param"
            formatOnBlur
            autosize
            styles={inputStyles}
            label={`${capitalize(variable.type)}`}
            {...form.getInputProps(`snippetValue.${index}.variables`)}
            minRows={3}
            validationError="Invalid JSON"
          />
        ))}
        <Group position="right" mt={'auto'} mb={24}>
          <div data-test-id="test-workflow-btn">
            <Button
              sx={{
                width: 'auto',
              }}
              fullWidth={false}
              disabled={!form.isValid()}
              data-test-id="test-trigger-btn"
              inherit
              loading={isLoading}
              onClick={() => {
                onTrigger(form.values);
                if (tagsIncludesOnboarding) {
                  segment.track(OnBoardingAnalyticsEnum.ONBOARDING_EXPERIMENT_TEST_NOTIFICATION, {
                    action: 'Workflow - Run trigger',
                    experiment_id: '2024-w9-onb',
                    _organization: currentOrganization?._id,
                  });
                }
              }}
            >
              Run Trigger
            </Button>
          </div>
        </Group>
      </WorkflowSidebar>
      <ExecutionDetailsModalWrapper
        transactionId={transactionId}
        isOpen={executionModalOpened}
        onClose={closeExecutionModal}
      />
    </>
  );
}
