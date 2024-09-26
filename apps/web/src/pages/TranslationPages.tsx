import { IS_SELF_HOSTED } from '../config';
import { Routes } from '../ee/translations';

export const TranslationRoutes = () => {
  if (IS_SELF_HOSTED) {
    return null;
  }

  return <Routes />;
};
