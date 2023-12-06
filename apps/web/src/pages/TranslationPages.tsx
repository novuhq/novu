import { IS_DOCKER_HOSTED } from '../config';

let Routes = () => null;

if (!IS_DOCKER_HOSTED) {
  try {
    const module = require('@novu/ee-translation-web');
    Routes = module.Routes;
  } catch (e) {}
}

export const TranslationRoutes = () => {
  return <Routes />;
};
