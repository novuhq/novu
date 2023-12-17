import { IS_DOCKER_HOSTED, IS_CI_EE_TEST } from '../config';
import { useIsTranslationManagerEnabled } from '../hooks';

export const TranslationRoutes = () => {
  const isTranslationManagerEnabled = useIsTranslationManagerEnabled();

  if ((!IS_DOCKER_HOSTED || IS_CI_EE_TEST) && isTranslationManagerEnabled) {
    const module = require('@novu/ee-translation-web');
    const Routes = module.Routes;

    return <Routes />;
  }

  try {
    const module = require('@novu/ee-translation-web');
    const Routes = module.Routes;

    return <Routes />;
  } catch (e) {}

  return null;
};
