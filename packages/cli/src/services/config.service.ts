import * as Configstore from 'configstore';
import jwt_decode from 'jwt-decode';
import { IJwt } from '../interfaces';

export class ConfigService {
  _config: Configstore;
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

  getDecodedToken(): IJwt {
    return jwt_decode(this._config.get('token'));
  }
}
