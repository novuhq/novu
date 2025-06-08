import React from 'react';
import { createContextHook } from '../context';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../api/api.client';
import { IOrganizationEntity } from '@novu/shared';
import { QueryKeys } from '../../utils/query-keys';
import { withJwtValidation } from './api-interceptor';
import { getJwtToken } from './jwt-manager';

export const OrganizationContext = React.createContext({});

// Function to fetch the current organization
const getCurrentOrganization = withJwtValidation(async () => {
  const response = await get<{ data: IOrganizationEntity }>('/organizations/me');
  return response.data;
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line react-refresh/only-export-components
export const useOrganization = createContextHook(OrganizationContext);
