import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import decode from 'jwt-decode';
import { useMantineColorScheme } from '@mantine/core';

import { JobTitleEnum } from '@novu/shared';
import type { ProductUseCases, IResponseError, ICreateOrganizationDto, IJwtPayload } from '@novu/shared';
import { HubspotForm, useSegment } from '@novu/shared-web';

import { api } from '../../../api/api.client';
import { useAuthContext } from '../../../components/providers/AuthProvider';
import { useVercelIntegration, useVercelParams } from '../../../hooks';
import { ROUTES } from '../../../constants/routes.enum';
import { HUBSPOT_FORM_IDS } from '../../../constants/hubspotForms';
import SetupLoader from './SetupLoader';
import { successMessage } from '@novu/design-system';

export function HubspotSignupForm() {
  const [loading, setLoading] = useState<boolean>();
  const navigate = useNavigate();
  const { setToken, token, currentUser } = useAuthContext();
  const { startVercelSetup } = useVercelIntegration();
  const { isFromVercel } = useVercelParams();
  const { colorScheme } = useMantineColorScheme();

  const segment = useSegment();

  const { mutateAsync: createOrganizationMutation } = useMutation<
    { _id: string },
    IResponseError,
    ICreateOrganizationDto
  >((data: ICreateOrganizationDto) => api.post(`/v1/organizations`, data));

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
    const { organizationName, jobTitle, ...rest } = data;
    const createDto: ICreateOrganizationDto = { ...rest, name: organizationName, jobTitle };
    const organization = await createOrganizationMutation(createDto);

    successMessage('Your Business trial has started');

    const organizationResponseToken = await api.post(`/v1/auth/organizations/${organization._id}/switch`, {});

    setToken(organizationResponseToken);
  }

  function jwtHasKey(key: string) {
    if (!token) return false;
    const jwt = decode<IJwtPayload>(token);

    return jwt && jwt[key];
  }

  const handleCreateOrganization = async (data: IOrganizationCreateForm) => {
    if (!data?.organizationName) return;

    segment.track('Button Clicked - [Signup]', { action: 'hubspot questionnaire form submit' });

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

          company: '',
          role___onboarding: '',
          heard_about_novu: '',
          use_case___onboarding: '',
          role___onboarding__other_: '',
          heard_about_novu__other_: '',
        }}
        readonlyProperties={['email']}
        focussedProperty="company"
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
