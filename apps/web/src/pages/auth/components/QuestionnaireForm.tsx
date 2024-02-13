import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import decode from 'jwt-decode';
import { Group, Input as MantineInput } from '@mantine/core';

import { JobTitleEnum, jobTitleToLabelMapper, ProductUseCasesEnum } from '@novu/shared';
import type { ProductUseCases, IResponseError, ICreateOrganizationDto, IJwtPayload } from '@novu/shared';
import {
  Button,
  Input,
  Select,
  Digest,
  Translation,
  MultiChannel,
  inputStyles,
  HalfClock,
  RingingBell,
} from '@novu/design-system';

import { api } from '../../../api/api.client';
import { useAuthContext } from '../../../components/providers/AuthProvider';
import { useVercelIntegration, useVercelParams } from '../../../hooks';
import { ROUTES } from '../../../constants/routes.enum';
import { DynamicCheckBox } from './dynamic-checkbox/DynamicCheckBox';

export function QuestionnaireForm() {
  const [loading, setLoading] = useState<boolean>();

  const navigate = useNavigate();
  const { setToken, token } = useAuthContext();
  const { startVercelSetup } = useVercelIntegration();
  const { isFromVercel } = useVercelParams();

  const { mutateAsync: createOrganizationMutation } = useMutation<
    { _id: string },
    IResponseError,
    ICreateOrganizationDto
  >((data: ICreateOrganizationDto) => api.post(`/v1/organizations`, data));

  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<IOrganizationCreateForm>({});

  useEffect(() => {
    if (token) {
      const userData = decode<IJwtPayload>(token);

      if (userData.environmentId) {
        if (isFromVercel) {
          startVercelSetup();

          return;
        }
        navigate(ROUTES.HOME);
      }
    }
  }, [token, navigate, isFromVercel, startVercelSetup]);

  async function createOrganization(data: IOrganizationCreateForm) {
    const { organizationName, ...rest } = data;
    const createDto: ICreateOrganizationDto = { ...rest, name: organizationName };
    const organization = await createOrganizationMutation(createDto);
    const organizationResponseToken = await api.post(`/v1/auth/organizations/${organization._id}/switch`, {});

    setToken(organizationResponseToken);
  }

  function jwtHasKey(key: string) {
    if (!token) return false;
    const jwt = decode<IJwtPayload>(token);

    return jwt && jwt[key];
  }

  const onCreateOrganization = async (data: IOrganizationCreateForm) => {
    if (!data?.organizationName) return;

    setLoading(true);

    if (!jwtHasKey('organizationId')) {
      await createOrganization({ ...data });
    }

    setLoading(false);
    if (isFromVercel) {
      startVercelSetup();

      return;
    }
    navigate(ROUTES.GET_STARTED);
  };

  return (
    <form noValidate name="create-app-form" onSubmit={handleSubmit(onCreateOrganization)}>
      <Controller
        name="jobTitle"
        control={control}
        rules={{
          required: 'Required - Job title',
        }}
        render={({ field }) => {
          return (
            <Select
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
        name="organizationName"
        control={control}
        rules={{
          required: 'Required - Company name',
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
        name="domain"
        control={control}
        render={({ field }) => {
          return (
            <Input
              label="Company domain"
              {...field}
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
          required: 'Required - Product use-case',
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
                      Icon={item.icon}
                      label={item.label}
                      onChange={(e) => handleCheckboxChange(e, item.type)}
                      key={item.type}
                      type={item.type}
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

interface IOrganizationCreateForm {
  organizationName: string;
  jobTitle: JobTitleEnum;
  domain?: string;
  productUseCases?: ProductUseCases;
}
