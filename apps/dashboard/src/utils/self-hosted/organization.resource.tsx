import { IOrganizationEntity } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { get } from '../../api/api.client';
import { QueryKeys } from '../../utils/query-keys';
import { createContextHook } from '../context';
import { withJwtValidation } from './api-interceptor';
import { getJwtToken } from './jwt-manager';

export const OrganizationContext = React.createContext({});

// Function to fetch the current organization
const getCurrentOrganization = withJwtValidation(async () => {
  const response = await get<{ data: IOrganizationEntity }>('/organizations/me');
  return response.data;
});

export function OrganizationContextProvider({ children }: any) {
  const { data: organization, isLoading } = useQuery({
    queryKey: [QueryKeys.myOrganization],
    queryFn: getCurrentOrganization,
    enabled: !!getJwtToken(),
  });

  const value = {
    organization: organization
      ? {
          name: organization.name,
          createdAt: new Date(organization.createdAt),
          updatedAt: new Date(organization.updatedAt),
          externalOrgId: organization._id,
          publicMetadata: {
            externalOrgId: organization._id,
          },
          _id: organization._id,
        }
      : {
          name: 'System Organization',
          createdAt: new Date(),
          updatedAt: new Date(),
          externalOrgId: null,
          publicMetadata: {
            externalOrgId: null,
          },
          _id: null,
        },
    isLoaded: isLoading,
  };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export const useOrganization = createContextHook(OrganizationContext);
