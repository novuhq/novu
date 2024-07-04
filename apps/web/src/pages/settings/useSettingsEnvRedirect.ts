import { useEnvironment } from '../../hooks';
import { BaseEnvironmentEnum } from '../../constants/BaseEnvironmentEnum';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const URL_PARAM = 'env';
const DEFAULT_ENV_NAME = BaseEnvironmentEnum.DEVELOPMENT;
const VALID_ENV_VALUES = new Set(Object.values(BaseEnvironmentEnum));

/** Redirect the user to a valid page if an invalid URL param is provided for env */
export const useSettingsEnvRedirect = () => {
  const { env } = useParams<typeof URL_PARAM>();
  const { environment, isLoading } = useEnvironment();
  const navigate = useNavigate();

  useEffect(() => {
    // don't redirect away until we've loaded the environment and checked it
    if (isLoading) {
      return;
    }

    const curPathname = window.location.pathname;
    const currentEnvName = environment?.name ?? DEFAULT_ENV_NAME;

    const redirectPath =
      !env || !VALID_ENV_VALUES.has(env as BaseEnvironmentEnum)
        ? `${curPathname}/${currentEnvName}`
        : curPathname.replace(`/${env}`, `/${currentEnvName}`);

    navigate(redirectPath);
  }, [env, environment, navigate, isLoading]);
};
