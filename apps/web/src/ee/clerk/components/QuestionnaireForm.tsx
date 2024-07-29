import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Group, Input as MantineInput } from '@mantine/core';
import { captureException } from '@sentry/react';
import { FeatureFlagsKeysEnum, IResponseError, UpdateExternalOrganizationDto } from '@novu/shared';
import { JobTitleEnum, jobTitleToLabelMapper } from '@novu/shared';
import { Button, inputStyles, Select } from '@novu/design-system';

import { api } from '../../../api/api.client';
import { useAuth } from '../../../hooks/useAuth';
import { useFeatureFlag, useVercelIntegration, useVercelParams, useEffectOnce } from '../../../hooks';
import { ROUTES } from '../../../constants/routes';
import styled from '@emotion/styled/macro';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { BRIDGE_SYNC_SAMPLE_ENDPOINT } from '../../../config/index';
import { DynamicCheckBox } from '../../../pages/auth/components/dynamic-checkbox/DynamicCheckBox';
import { useContainer } from '../../../studio/components/workflows/step-editor/editor/useContainer';

function updateClerkOrgMetadata(data: UpdateExternalOrganizationDto) {
  return api.post('/v1/clerk/organization', data);
}

export function QuestionnaireForm() {
  const isV2Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_EXPERIENCE_ENABLED);
  const isPlaygroundOnboardingEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_PLAYGROUND_ONBOARDING_ENABLED);
  const [loading, setLoading] = useState<boolean>();
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<OrganizationUpdateForm>({});
  const navigate = useNavigate();
  const { reloadOrganization } = useAuth();
  const { startVercelSetup } = useVercelIntegration();
  const { isFromVercel } = useVercelParams();
  const segment = useSegment();
  const location = useLocation();
  const { initializeWebContainer } = useContainer();

  useEffectOnce(() => {
    initializeWebContainer();
  }, isPlaygroundOnboardingEnabled);

  const { mutateAsync: updateOrganizationMutation } = useMutation<{ _id: string }, IResponseError, any>(
    (data: UpdateExternalOrganizationDto) => updateClerkOrgMetadata(data)
  );

  async function updateOrganization(data: UpdateExternalOrganizationDto) {
    const selectedLanguages = Object.keys(data.language || {}).filter((key) => data.language && data.language[key]);

    const updateClerkOrgDto: UpdateExternalOrganizationDto = {
      jobTitle: data.jobTitle,
      domain: data.domain,
      language: selectedLanguages,
    };
    await updateOrganizationMutation(updateClerkOrgDto);

    segment.track('Create Organization Form Submitted', {
      location: (location.state as any)?.origin || 'web',
      language: selectedLanguages,
      jobTitle: data.jobTitle,
    });

    // get updated organization data in session
    await reloadOrganization();
  }

  const onUpdateOrganization = async (data: OrganizationUpdateForm) => {
    setLoading(true);
    await updateOrganization({ ...data });
    setLoading(false);

    try {
      await api.post(`/v1/bridge/sync?source=sample-workspace`, {
        bridgeUrl: BRIDGE_SYNC_SAMPLE_ENDPOINT,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);

      captureException(e);
    }

    if (isFromVercel) {
      startVercelSetup();

      return;
    }

    if (isV2Enabled) {
      if (isJobTitleIsTech(data.jobTitle)) {
        if (isPlaygroundOnboardingEnabled) {
          navigate(ROUTES.DASHBOARD_PLAYGROUND);
        } else {
          navigate(ROUTES.DASHBOARD_ONBOARDING);
        }
      } else {
        navigate(ROUTES.WORKFLOWS);
      }

      return;
    }

    navigate(`${ROUTES.GET_STARTED}`);
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

  return (
    <form noValidate name="create-app-form" onSubmit={handleSubmit(onUpdateOrganization)}>
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

interface OrganizationUpdateForm {
  jobTitle: JobTitleEnum;
  domain?: string;
  language?: string[];
  frontendStack?: string[];
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
