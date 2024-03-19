import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import decode from 'jwt-decode';
import { useMantineColorScheme } from '@mantine/core';

import { JobTitleEnum } from '@novu/shared';
import type { IResponseError, ICreateOrganizationDto, IJwtPayload, IOrganizationEntity } from '@novu/shared';
import { HubspotForm, useSegment } from '@novu/shared-web';

import { api } from '../../../api/api.client';
import { useAuthContext } from '../../../components/providers/AuthProvider';
import { useVercelIntegration, useVercelParams } from '../../../hooks';
import { ROUTES } from '../../../constants/routes.enum';
import { HUBSPOT_FORM_IDS } from '../../../constants/hubspotForms';
import SetupLoader from './SetupLoader';

export function HubspotSignupForm() {
  const [loading, setLoading] = useState<boolean>();
  const [existingOrganization, setExistingOrganization] = useState<IOrganizationEntity>();
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

  const { mutateAsync: updateUserMutation } = useMutation<{ _id: string }, IResponseError, IUserUpdateForm>(
    (data: IUserUpdateForm) => api.put(`/v1/users/profile`, data)
  );

  const fetchExistingOrganization = async () => {
    return api.get(`/v1/organizations/me`);
  };

  useEffect(() => {
    if (token) {
      const userData = decode<IJwtPayload>(token);
      if (userData.environmentId) {
        // if user is invited to an organization, fetch that organization name
        (async () => {
          const org = await fetchExistingOrganization();
          setExistingOrganization(org);
        })();

        if (isFromVercel) {
          startVercelSetup();

          return;
        }
      }
    }

    return () => {};
  }, [token, isFromVercel, startVercelSetup]);

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

  const handleCreateOrganization = async (data: IOrganizationCreateForm) => {
    if (!data?.organizationName) return;

    if (!jwtHasKey('organizationId')) {
      await createOrganization({ ...data });
    }

    setLoading(false);
    if (isFromVercel) {
      startVercelSetup();

      return;
    }
  };

  const handleFormSubmission = async (values) => {
    segment.track('Button Clicked - [Signup]', { action: 'hubspot questionnaire form submit' });
    setLoading(true);

    const submissionValues = values?.submissionValues as unknown as {
      company: string;
      role___onboarding: string;
      firstname: string;
      lastname: string;
    };

    // update user profile data on form submit
    await updateUserMutation({
      firstName: submissionValues?.firstname,
      lastName: submissionValues?.lastname,
      jobTitle: hubspotRoleToJobTitleMapping[submissionValues?.role___onboarding],
    });

    // skip organization creation if user is signing up with invitation
    if (!existingOrganization) {
      await handleCreateOrganization({
        organizationName: submissionValues?.company,
      });
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

          company: existingOrganization ? existingOrganization.name : '',
          role___onboarding: '',
          heard_about_novu: '',
          use_case___onboarding: '',
          role___onboarding__other_: '',
          heard_about_novu__other_: '',
        }}
        readonlyProperties={existingOrganization ? ['email', 'company'] : ['email']}
        focussedProperty={existingOrganization ? 'role___onboarding' : 'company'}
        onFormSubmitted={($form, values) => handleFormSubmission(values)}
        colorScheme={colorScheme}
      />
    );
  }
}

interface IOrganizationCreateForm {
  organizationName: string;
}
interface IUserUpdateForm {
  firstName: string;
  lastName: string;
  jobTitle: JobTitleEnum;
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
