import { IS_DOCKER_HOSTED } from '../config';
import { useIsTranslationManagerEnabled } from '../hooks';

export const TranslationRoutes = () => {
  const isTranslationManagerEnabled = useIsTranslationManagerEnabled();

  if (IS_DOCKER_HOSTED && !isTranslationManagerEnabled) {
    return null;
  }

  try {
    const module = require('@novu/ee-translation-web');
    const Routes = module.Routes;

    return <Routes />;
  } catch (e) {}

  return null;
};
