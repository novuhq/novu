import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Group, Input as MantineInput } from '@mantine/core';
import {
  JobTitleEnum,
  jobTitleToLabelMapper,
  ProductUseCasesEnum,
  FeatureFlagsKeysEnum,
  UpdateExternalOrganizationDto,
  IResponseError,
  ProductUseCases,
} from '@novu/shared';
import {
  Button,
  Digest,
  HalfClock,
  Input,
  inputStyles,
  MultiChannel,
  RingingBell,
  Select,
  Translation,
} from '@novu/design-system';

import { api } from '../../../api/api.client';
import { useAuth } from '../../../hooks/useAuth';
import { useFeatureFlag, useVercelIntegration, useVercelParams } from '../../../hooks';
import { ROUTES } from '../../../constants/routes';
import { DynamicCheckBox } from '../../../pages/auth/components/dynamic-checkbox/DynamicCheckBox';
import styled from '@emotion/styled/macro';
import { useDomainParser } from '../../../pages/auth/components/useDomainHook';

function updateClerkOrgMetadata(data: UpdateExternalOrganizationDto) {
  return api.post('/v1/clerk/organization', data);
}

export function QuestionnaireForm() {
  const isV2Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_EXPERIENCE_ENABLED);
  const [loading, setLoading] = useState<boolean>();
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<UpdateExternalOrganizationDto>({});
  const navigate = useNavigate();
  const { currentOrganization, reloadOrganization } = useAuth();
  const { startVercelSetup } = useVercelIntegration();
  const { isFromVercel } = useVercelParams();
  const { parse } = useDomainParser();

  const { mutateAsync: updateOrganizationMutation } = useMutation<{ _id: string }, IResponseError, any>(
    (data: UpdateExternalOrganizationDto) => updateClerkOrgMetadata(data)
  );

  useEffect(() => {
    if (currentOrganization) {
      if (isFromVercel) {
        startVercelSetup();

        return;
      }
    }
  }, [isFromVercel, startVercelSetup, currentOrganization]);

  async function updateOrganization(data: UpdateExternalOrganizationDto) {
    const updateClerkOrgDto: UpdateExternalOrganizationDto = {
      jobTitle: data.jobTitle,
      domain: data.domain,
      productUseCases: data.productUseCases,
    };
    await updateOrganizationMutation(updateClerkOrgDto);
    // get updated organization data in session
    await reloadOrganization();
  }

  const onUpdateOrganization = async (data: UpdateExternalOrganizationDto) => {
    setLoading(true);
    await updateOrganization({ ...data });
    setLoading(false);

    if (isFromVercel) {
      startVercelSetup();

      return;
    }

    if (isV2Enabled) {
      navigate(ROUTES.WORKFLOWS + '?onboarding=true');

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
        name="domain"
        control={control}
        rules={{
          validate: {
            isValiDomain: (value) => {
              const val = parse(value as string);

              if (value && !val.isIcann) {
                return 'Please provide a valid domain';
              }
            },
          },
        }}
        render={({ field }) => {
          return (
            <Input
              label="Company domain"
              {...field}
              error={errors.domain?.message}
              placeholder="my-company.com"
              data-test-id="questionnaire-company-domain"
              mt={32}
            />
          );
        }}
      />

      <Controller
        name="productUseCases"
        control={control}
        rules={{
          required: 'Please specify your use case',
        }}
        render={({ field, fieldState }) => {
          function handleCheckboxChange(e, channelType) {
            const newUseCases: ProductUseCases = field.value || {};
            newUseCases[channelType] = e.currentTarget.checked;
            field.onChange(newUseCases);
          }

          return (
            <MantineInput.Wrapper
              label="What do you plan to use Novu for?"
              styles={inputStyles}
              error={fieldState.error?.message}
              mt={32}
              required
            >
              <Group
                mt={8}
                mx={'8px'}
                style={{ marginLeft: '-12px', marginRight: '-12px', gap: '0', justifyContent: 'space-between' }}
              >
                <>
                  {checkBoxData.map((item) => (
                    <DynamicCheckBox
                      label={item.label}
                      onChange={(e) => handleCheckboxChange(e, item.type)}
                      key={item.type}
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

const checkBoxData = [
  { type: ProductUseCasesEnum.IN_APP, icon: RingingBell, label: 'In-app' },
  { type: ProductUseCasesEnum.MULTI_CHANNEL, icon: MultiChannel, label: 'Multi-channel' },
  { type: ProductUseCasesEnum.DIGEST, icon: Digest, label: 'Digest' },
  { type: ProductUseCasesEnum.DELAY, icon: HalfClock, label: 'Delay' },
  { type: ProductUseCasesEnum.TRANSLATION, icon: Translation, label: 'Translate' },
];
