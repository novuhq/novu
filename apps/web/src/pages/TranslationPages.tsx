export const TranslationRoutes = () => {
  let Routes;
  try {
    const module = require('@novu/ee-translation-web');
    Routes = module.Routes;
  } catch (error) {
    Routes = null;
  }

  return Routes ? <Routes /> : null;
};
