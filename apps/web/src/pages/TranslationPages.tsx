import { IS_DOCKER_HOSTED } from '../config';

export const TranslationRoutes = () => {
  if (IS_DOCKER_HOSTED) {
    return null;
  }

  try {
    const module = require('../ee/translations');
    const Routes = module.Routes;

    return <Routes />;
  } catch (e) {
    debugger;
    console.error('Failed to load EE translations routes', e);
  }

  return null;
};
