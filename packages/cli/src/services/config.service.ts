import * as Configstore from 'configstore';
import jwt_decode from 'jwt-decode';
import { IJwtPayload } from '@notifire/shared';

export class ConfigService {
  private _config: Configstore;
  constructor() {
    this._config = new Configstore('notu-cli');
  }

  setValue(key: string, value: string) {
    this._config.set(key, value);
  }

  getValue(key: string) {
    return this._config.get(key);
  }

  isOrganizationIdExist(): boolean {
    return !!this.getDecodedToken().organizationId;
  }

  isApplicationIdExist(): boolean {
    return !!this.getDecodedToken().applicationId;
  }

  getDecodedToken(): IJwtPayload {
    return jwt_decode(this._config.get('token'));
  }
}
