import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserProfileSidebarTypeEnum, USER_PROFILE_SIDEBAR_TYPE_SET } from './UserProfilePasswordSidebarEnum';

const TOKEN_PARAM = 'token';
const SIDEBAR_PARAM = 'view';

const getValidatedSidebarType = (sidebarParam: string | null): sidebarParam is UserProfileSidebarTypeEnum => {
  return !!sidebarParam && USER_PROFILE_SIDEBAR_TYPE_SET.has(sidebarParam as UserProfileSidebarTypeEnum);
};

export const useUserProfileSearchParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const updateSidebarParam = (sidebarParam: UserProfileSidebarTypeEnum | null) => {
    const newSearchParams = new URLSearchParams(document.location.search);

    if (sidebarParam) {
      newSearchParams.set(SIDEBAR_PARAM, sidebarParam);
    } else {
      newSearchParams.delete(SIDEBAR_PARAM);
    }

    setSearchParams(newSearchParams, { replace: true });
  };

  const clearTokenParam = () => {
    const newSearchParams = new URLSearchParams(document.location.search);

    newSearchParams.delete(TOKEN_PARAM);

    setSearchParams(newSearchParams, { replace: true });
  };

  const sidebarParam = searchParams.get(SIDEBAR_PARAM);
  const sidebarType = useMemo(() => {
    // prevent from setting an invalid sidebar type if someone tampers with the URL
    return getValidatedSidebarType(sidebarParam) ? sidebarParam : null;
  }, [sidebarParam]);

  return {
    token: searchParams.get(TOKEN_PARAM) ?? undefined,
    sidebarType,
    updateSidebarParam,
    clearTokenParam,
  };
};
