import { NO_PERMISSIONS_KEY, OAUTH_ACCESSIBLE_METADATA_KEY } from '@novu/application-generic';
import { expect } from 'chai';
import { UsersController } from './user.controller';

describe('UsersController', () => {
  /*
   * With RBAC on, a route without permission metadata requires every permission, which only the Owner
   * holds. The MCP server probes this route with the member's OAuth token, so every role must pass.
   */
  it('lets every member read their own profile on GET /users/me', () => {
    const handler = UsersController.prototype.getMyProfile;

    expect(Reflect.getMetadata(NO_PERMISSIONS_KEY, handler)).to.equal(true);
    expect(Reflect.getMetadata(OAUTH_ACCESSIBLE_METADATA_KEY, handler)).to.equal(true);
  });
});
