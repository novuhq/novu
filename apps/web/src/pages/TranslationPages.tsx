import { IS_DOCKER_HOSTED } from '../config';

export const TranslationRoutes = () => {
  let Routes = () => null;
  if (IS_DOCKER_HOSTED) {
    return <Routes />;
  }

  try {
    const module = require('@novu/ee-translation-web');
    Routes = module.Routes;
  } catch (e) {}

  return <Routes />;
};
