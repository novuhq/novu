import { IS_DOCKER_HOSTED } from '../config';
import { Routes } from '../ee/translations';

export const TranslationRoutes = () => {
  if (IS_DOCKER_HOSTED) {
    return null;
  }

  return <Routes />;
};
