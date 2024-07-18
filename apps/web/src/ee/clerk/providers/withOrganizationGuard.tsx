import { useUser, useOrganizationList, useAuth } from '@clerk/clerk-react';
import { ComponentType, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';

export const withOrganizationGuard = <P extends Record<string, any>>(
  WrappedComponent: ComponentType<P>
): React.FC<P> => {
  return (props: P) => {
    const navigate = useNavigate();
    const { orgId } = useAuth();
    const { user: clerkUser } = useUser();
    const { isLoaded: isOrgListLoaded, setActive } = useOrganizationList({ userMemberships: { infinite: true } });

    useEffect(() => {
      if (!orgId && isOrgListLoaded && clerkUser) {
        const hasOrgs = clerkUser.organizationMemberships.length > 0;

        if (hasOrgs) {
          const firstOrg = clerkUser.organizationMemberships[0].organization;
          setActive({ organization: firstOrg });
        } else {
          navigate(ROUTES.AUTH_SIGNUP_ORGANIZATION_LIST);
        }
      }
    }, [navigate, setActive, isOrgListLoaded, clerkUser, orgId]);

    return <WrappedComponent {...(props as P)} />;
  };
};
