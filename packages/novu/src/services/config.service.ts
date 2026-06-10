import { UserSessionData } from '@novu/shared';
import Configstore from 'configstore';
import jwt_decode from 'jwt-decode';

type OriginPort = number;
type ConfigKey = 'token' | 'anonymousId' | `tunnelUrl-${OriginPort}`;

export class ConfigService {
  private _config: Configstore;
  constructor() {
    this._config = new Configstore('novu-cli');
  }

  setValue(key: ConfigKey, value: string) {
    this._config.set(key, value);
  }

  getValue(key: ConfigKey) {
    return this._config.get(key);
  }

  async clearStore() {
    return this._config.clear();
  }

  isOrganizationIdExist(): boolean {
    return !!this.getDecodedToken().organizationId;
  }

  isEnvironmentIdExist(): boolean {
    return !!this.getDecodedToken().environmentId;
  }

  getToken(): string {
    return this.getValue('token');
  }

  getDecodedToken(): UserSessionData {
    if (!this.getToken()) {
      return null;
    }

    return jwt_decode(this.getToken());
  }
}
