import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UserProfilePasswordSidebarEnum,
  USER_PROFILE_PASSWORD_SIDEBAR_VALUE_SET,
} from './UserProfilePasswordSidebarEnum';

const TOKEN_PARAM = 'token';
const SIDEBAR_PARAM = 'view';

const getValidatedSidebarType = (sidebarParam: string | null): sidebarParam is UserProfilePasswordSidebarEnum => {
  return !!sidebarParam && USER_PROFILE_PASSWORD_SIDEBAR_VALUE_SET.has(sidebarParam as UserProfilePasswordSidebarEnum);
};

export const useUserProfileSearchParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const updateSidebarParam = (sidebarParam: UserProfilePasswordSidebarEnum | null) => {
    const newSearchParams = new URLSearchParams(document.location.search);

    if (sidebarParam) {
      newSearchParams.set(SIDEBAR_PARAM, sidebarParam);
    } else {
      newSearchParams.delete(SIDEBAR_PARAM);
    }

    setSearchParams(newSearchParams, { replace: true });
  };

  const sidebarParam = searchParams.get(SIDEBAR_PARAM);
  const sidebarType = useMemo(() => {
    return getValidatedSidebarType(sidebarParam) ? sidebarParam : null;
  }, [sidebarParam]);

  return {
    token: searchParams.get(TOKEN_PARAM),
    sidebarType,
    updateSidebarParam,
  };
};
