import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useMantineColorScheme } from '@mantine/core';

import {
  FeatureFlagsKeysEnum,
  ICreateOrganizationDto,
  IResponseError,
  ProductUseCases,
  JobTitleEnum,
} from '@novu/shared';
import { successMessage } from '@novu/design-system';
import { useAuth, useFeatureFlag, useVercelIntegration, useVercelParams } from '../../../hooks';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { HubspotForm } from '../../../ee/billing/components/HubspotForm';

import { api } from '../../../api/api.client';
import { ROUTES } from '../../../constants/routes';
import { HUBSPOT_FORM_IDS } from '../../../constants/hubspotForms';
import SetupLoader from './SetupLoader';

export function HubspotSignupForm() {
  const [loading, setLoading] = useState<boolean>();
  const navigate = useNavigate();
  const { login, currentUser, currentOrganization } = useAuth();
  const { startVercelSetup } = useVercelIntegration();
  const { isFromVercel } = useVercelParams();
  const { colorScheme } = useMantineColorScheme();
  const isV2Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_ENABLED);

  const segment = useSegment();

  const { mutateAsync: createOrganizationMutation } = useMutation<
    { _id: string },
    IResponseError,
    ICreateOrganizationDto
  >((data: ICreateOrganizationDto) => api.post(`/v1/organizations`, data));

  useEffect(() => {
    if (currentUser) {
      if (currentOrganization) {
        if (isFromVercel) {
          startVercelSetup();
        }
      }
    }
  }, [currentUser, currentOrganization, isFromVercel, startVercelSetup]);

  async function createOrganization(data: IOrganizationCreateForm) {
    const { organizationName, jobTitle, ...rest } = data;
    const createDto: ICreateOrganizationDto = { ...rest, name: organizationName, jobTitle };
    const organization = await createOrganizationMutation(createDto);

    successMessage('Your Business trial has started');

    // TODO: Move this into useAuth
    const organizationResponseToken = await api.post(`/v1/auth/organizations/${organization._id}/switch`, {});

    login(organizationResponseToken, isV2Enabled ? `${ROUTES.WORKFLOWS}?onboarding=true` : ROUTES.GET_STARTED);
  }

  const handleCreateOrganization = async (data: IOrganizationCreateForm) => {
    if (!data?.organizationName) return;

    segment.track('Button Clicked - [Signup]', { action: 'hubspot questionnaire form submit' });

    setLoading(true);

    if (!currentOrganization) {
      await createOrganization({ ...data });
    }

    setLoading(false);
    if (isFromVercel) {
      startVercelSetup();

      return;
    }
    navigate(isV2Enabled ? `${ROUTES.WORKFLOWS}?onboarding=true` : ROUTES.GET_STARTED);
  };

  if (!currentUser || loading) {
    return <SetupLoader title="Loading..." />;
  } else {
    return (
      <HubspotForm
        formId={HUBSPOT_FORM_IDS.SIGN_UP}
        properties={{
          firstname: currentUser?.firstName as string,
          lastname: currentUser?.lastName as string,
          email: currentUser?.email as string,

          company: (currentOrganization?.name as string) || '',
          role___onboarding: '',
          heard_about_novu: '',
          use_case___onboarding: '',
          role___onboarding__other_: '',
          heard_about_novu__other_: '',
        }}
        readonlyProperties={currentOrganization ? ['email', 'company'] : ['email']}
        focussedProperty={currentOrganization ? 'role___onboarding' : 'company'}
        onFormSubmitted={($form, values) => {
          const submissionValues = values?.submissionValues as unknown as {
            company: string;
            role___onboarding: string;
          };

          handleCreateOrganization({
            organizationName: submissionValues?.company,
            jobTitle: hubspotRoleToJobTitleMapping[submissionValues?.role___onboarding],
          });
        }}
        colorScheme={colorScheme}
      />
    );
  }
}

interface IOrganizationCreateForm {
  organizationName: string;
  jobTitle: JobTitleEnum;
  domain?: string;
  productUseCases?: ProductUseCases;
}

const hubspotRoleToJobTitleMapping: Record<string, JobTitleEnum> = {
  'Engineer/developer': JobTitleEnum.ENGINEER,
  Product: JobTitleEnum.PRODUCT_MANAGER,
  Architect: JobTitleEnum.ARCHITECT,
  'Engineering Manager': JobTitleEnum.ENGINEERING_MANAGER,
  Designer: JobTitleEnum.DESIGNER,
  'CxO/founder': JobTitleEnum.FOUNDER,
  Marketing: JobTitleEnum.MARKETING_MANAGER,
  'Other (specify)': JobTitleEnum.OTHER,
};
