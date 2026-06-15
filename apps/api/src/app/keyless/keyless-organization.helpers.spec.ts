import { expect } from 'chai';
import { isKeylessOrganization } from './keyless-organization.helpers';

describe('keyless-organization.helpers', () => {
  const originalKeylessOrgId = process.env.KEYLESS_ORGANIZATION_ID;

  afterEach(() => {
    if (originalKeylessOrgId === undefined) {
      delete process.env.KEYLESS_ORGANIZATION_ID;
    } else {
      process.env.KEYLESS_ORGANIZATION_ID = originalKeylessOrgId;
    }
  });

  it('isKeylessOrganization returns true only for the configured org', () => {
    process.env.KEYLESS_ORGANIZATION_ID = 'org-keyless';

    expect(isKeylessOrganization('org-keyless')).to.equal(true);
    expect(isKeylessOrganization('org-other')).to.equal(false);
  });
});
