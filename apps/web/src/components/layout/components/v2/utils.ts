import { IEnvironment } from '@novu/shared';
import { getTunnelUrl } from '../../../../api/bridge/utils';
import { isStudioRoute } from '../../../../studio/utils/isStudioRoute';

export const getBridgeUrl = (env: IEnvironment | undefined, pathname: string) => {
  return isStudioRoute(pathname) ? getTunnelUrl() : env?.echo?.url;
};
