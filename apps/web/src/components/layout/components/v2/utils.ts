import { IEnvironment } from '@novu/shared';
import { getTunnelUrl } from '../../../../api/bridge/utils';

export const isLocalEnv = (pathname: string) => pathname.includes('/studio');

export const getBridgeUrl = (env: IEnvironment | undefined, pathname: string) => {
  let bridgeUrl: string | null | undefined;
  if (isLocalEnv(pathname)) {
    bridgeUrl = getTunnelUrl();
  } else {
    bridgeUrl = env?.echo?.url;
  }

  return bridgeUrl;
};
