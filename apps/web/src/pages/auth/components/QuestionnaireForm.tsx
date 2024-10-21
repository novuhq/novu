import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Group, Input as MantineInput } from '@mantine/core';
import { captureException } from '@sentry/react';

import {
  FeatureFlagsKeysEnum,
  ICreateOrganizationDto,
  IResponseError,
  JobTitleEnum,
  jobTitleToLabelMapper,
  ProductUseCases,
  ProductUseCasesEnum,
} from '@novu/shared';
import { Button, Input, inputStyles, Select } from '@novu/design-system';

import styled from '@emotion/styled/macro';
import { api } from '../../../api/api.client';
import { useAuth } from '../../../hooks/useAuth';
import { useEffectOnce, useEnvironment, useFeatureFlag, useVercelIntegration, useVercelParams } from '../../../hooks';
import { ROUTES } from '../../../constants/routes';
import { DynamicCheckBox } from './dynamic-checkbox/DynamicCheckBox';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { BRIDGE_SYNC_SAMPLE_ENDPOINT } from '../../../config/index';
import { QueryKeys } from '../../../api/query.keys';
import { useWebContainerSupported } from '../../../hooks/useWebContainerSupport';
import { useContainer } from '../../../hooks/useContainer';

export function QuestionnaireForm() {
  const queryClient = useQueryClient();
  const { initializeWebContainer } = useContainer();
  const { isSupported } = useWebContainerSupported();
  const isV2Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_ENABLED);
  const isPlaygroundOnboardingEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_PLAYGROUND_ONBOARDING_ENABLED);

  useEffectOnce(() => {
    if (isSupported) {
      initializeWebContainer();
    }
  }, isPlaygroundOnboardingEnabled);

  const [loading, setLoading] = useState<boolean>();
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<IOrganizationCreateForm>({});
  const navigate = useNavigate();
  const { login, currentOrganization } = useAuth();
  const { refetchEnvironments } = useEnvironment();
  const { startVercelSetup } = useVercelIntegration();
  const { isFromVercel } = useVercelParams();
  const segment = useSegment();
  const location = useLocation();

  const { mutateAsync: createOrganizationMutation } = useMutation<
    { _id: string },
    IResponseError,
    ICreateOrganizationDto
  >((data: ICreateOrganizationDto) => api.post(`/v1/organizations`, data));

  async function createOrganization(data: IOrganizationCreateForm) {
    const { organizationName, ...rest } = data;
    const selectedLanguages = Object.keys(data.language || {}).filter((key) => data.language && data.language[key]);

    const createDto: ICreateOrganizationDto = {
      ...rest,
      name: organizationName,
      language: selectedLanguages,
    };
    const organization = await createOrganizationMutation(createDto);

    const organizationResponseToken = await api.post(`/v1/auth/organizations/${organization._id}/switch`, {});
    await login(organizationResponseToken);

    segment.track('Create Organization Form Submitted', {
      location: (location.state as any)?.origin || 'web',
      language: selectedLanguages,
      jobTitle: data.jobTitle,
    });

    return organization;
  }

  const onCreateOrganization = async (data: IOrganizationCreateForm) => {
    if (!data?.organizationName) return;

    setLoading(true);

    if (!currentOrganization) {
      const organization = await createOrganization({ ...data });

      await refetchEnvironments();

      try {
        await api.post(`/v1/bridge/sync?source=sample-workspace`, {
          bridgeUrl: BRIDGE_SYNC_SAMPLE_ENDPOINT,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);

        captureException(e);
      }

      await queryClient.refetchQueries({ queryKey: [QueryKeys.myEnvironments, organization?._id] });
    } else {
      await refetchEnvironments();
    }

    setLoading(false);
    if (isFromVercel) {
      startVercelSetup();

      return;
    }

    if (isV2Enabled) {
      if (isJobTitleIsTech(data.jobTitle)) {
        if (isPlaygroundOnboardingEnabled && isSupported) {
          navigate(ROUTES.DASHBOARD_PLAYGROUND);
        } else {
          trackRedirectionToOnboarding();
          navigate(ROUTES.DASHBOARD_ONBOARDING);
        }
      } else {
        navigate(ROUTES.GET_STARTED);
      }

      return;
    }

    navigate(ROUTES.GET_STARTED);
  };

  /**
   * This is a temporary fix for making the form cohesive.
   * However, in the long term it should be addressed at the Design System level.
   */
  const StyledSelect = styled(Select)`
    .mantine-Select-invalid {
      /* TODO: our current error color isn't from our color configs :/ */
      border-color: #e03131;
    }
  `;

  const trackRedirectionToOnboarding = () => {
    if (isPlaygroundOnboardingEnabled && !isSupported) {
      segment.track(
        'Redirected to onboarding page because the playground was not supported on the browser - [Sign-Up]'
      );
    }
  };

  return (
    <form noValidate name="create-app-form" onSubmit={handleSubmit(onCreateOrganization)}>
      <Controller
        name="organizationName"
        control={control}
        rules={{
          required: 'Please specify your company name',
        }}
        render={({ field }) => {
          return (
            <Input
              label="Company name"
              {...field}
              error={errors.organizationName?.message}
              placeholder="Enter your company name"
              data-test-id="questionnaire-company-name"
              mt={32}
              required
            />
          );
        }}
      />

      <Controller
        name="jobTitle"
        control={control}
        rules={{
          required: 'Please specify your job title',
        }}
        render={({ field }) => {
          return (
            <StyledSelect
              label="Job title"
              data-test-id="questionnaire-job-title"
              error={errors.jobTitle?.message}
              {...field}
              allowDeselect={false}
              placeholder="Select an option"
              data={Object.values(JobTitleEnum).map((item) => ({
                label: jobTitleToLabelMapper[item],
                value: item,
              }))}
              required
            />
          );
        }}
      />

      <Controller
        name="language"
        control={control}
        rules={{
          required: 'Please specify your back-end languages',
        }}
        render={({ field, fieldState }) => {
          function handleCheckboxChange(e, channelType) {
            const languages = field.value || {};

            languages[channelType] = e.currentTarget.checked;

            field.onChange(languages);
          }

          return (
            <MantineInput.Wrapper
              data-test-id="language-checkbox"
              label="Choose your back-end stack"
              styles={inputStyles}
              error={fieldState.error?.message}
              mt={32}
              required
            >
              <Group
                mt={8}
                mx={'8px'}
                style={{ marginLeft: '-1px', marginRight: '-3px', gap: '0', justifyContent: 'space-between' }}
              >
                <>
                  {backendLanguages.map((item) => (
                    <DynamicCheckBox
                      label={item.label}
                      onChange={(e) => handleCheckboxChange(e, item.label)}
                      key={item.label}
                    />
                  ))}
                </>
              </Group>
            </MantineInput.Wrapper>
          );
        }}
      />
      <Button mt={40} inherit submit data-test-id="submit-btn" loading={loading}>
        Get started with Novu
      </Button>
    </form>
  );
}

const backendLanguages = [
  { label: 'Node.js' },
  { label: 'Python' },
  { label: 'Go' },
  { label: 'PHP' },
  { label: 'Rust' },
  { label: 'Java' },
  { label: 'Other' },
];

const frontendFrameworks = [
  { label: 'React' },
  { label: 'Vue' },
  { label: 'Angular' },
  { label: 'Flutter' },
  { label: 'React Native' },
  { label: 'Other' },
];

interface IOrganizationCreateForm {
  organizationName: string;
  jobTitle: JobTitleEnum;
  domain?: string;
  language?: string[];
  frontendStack?: string[];
}

function findFirstUsecase(useCases: ProductUseCases | undefined): ProductUseCasesEnum | undefined {
  if (useCases) {
    const keys = Object.keys(useCases) as ProductUseCasesEnum[];

    return keys.find((key) => useCases[key] === true);
  }

  return undefined;
}

function isJobTitleIsTech(jobTitle: JobTitleEnum) {
  return [
    JobTitleEnum.ENGINEER,
    JobTitleEnum.ENGINEERING_MANAGER,
    JobTitleEnum.ARCHITECT,
    JobTitleEnum.FOUNDER,
    JobTitleEnum.STUDENT,
  ].includes(jobTitle);
}
