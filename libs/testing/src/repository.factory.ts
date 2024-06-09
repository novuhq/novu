export function getRepository<T>(enterpriseClassName: string, communityClass: new () => T): T {
  if (process.env.NOVU_ENTERPRISE === 'true') {
    const enterpriseModule = require('@novu/ee-auth');
    const enterpriseRepository = enterpriseModule?.[enterpriseClassName];

    if (enterpriseRepository) {
      return new enterpriseRepository();
    }
    throw new Error(`Class ${enterpriseClassName} not found in module @novu/ee-auth`);
  }

  return new communityClass();
}
