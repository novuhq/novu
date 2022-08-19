import * as Configstore from 'configstore';
import jwt_decode from 'jwt-decode';
import { IJwtPayload } from '@novu/shared';

export class ConfigService {
  private _config: Configstore;
  constructor() {
    this._config = new Configstore('novu-cli');
  }

  setValue(key: string, value: string) {
    this._config.set(key, value);
  }

  getValue(key: string) {
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
    return this._config.get('token');
  }

  getDecodedToken(): IJwtPayload {
    if (!this.getToken()) {
      return null;
    }

    return jwt_decode(this.getToken());
  }
}
