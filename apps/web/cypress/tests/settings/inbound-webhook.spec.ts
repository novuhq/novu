import { IEnvironment } from '@novu/shared';

const validateExternalLink = ({ label, href }: { label: string | RegExp; href: string }) => {
  cy.contains('a', label).should('have.attr', 'target', '_blank');
  cy.contains('a', label).should('have.attr', 'rel', 'noopener noreferrer');
  cy.contains('a', label).should('have.attr', 'href').should('eq', href);
};

interface IMockEnv {
  envName?: string;
  mxRecordConfigured?: boolean;
  inboundParseDomain?: string;
}

const mockEnvs = ({ envName = 'Development', mxRecordConfigured = false, inboundParseDomain = '' }: IMockEnv = {}) => {
  const dns: IEnvironment['dns'] = {
    mxRecordConfigured,
    inboundParseDomain,
  };

  const env = {
    _id: 'envId',
    name: envName,
    _organizationId: 'orgId',
    dns,
  };

  cy.intercept('GET', '/v1/environments', {
    data: [env],
  }).as('webhook-envs');

  cy.intercept('GET', '/v1/environments/me', {
    data: env,
  }).as('webhook-current-env');

  cy.intercept('PUT', '/v1/environments/**', {
    data: { success: true },
  });
};

describe('Inbound Webhook Page', () => {
  const TEST_URL = '/settings/webhook/Development';
  const launchTestPage = () =>
    cy.waitLoadEnv(() => {
      cy.visit(TEST_URL);
    });

  const testClipboardInput = (inputTestId: string) => {
    cy.getByTestId(`${inputTestId}-copy`).focus().click();
    cy.getClipboardValue().then((clipVal) => {
      cy.getByTestId(`${inputTestId}`)
        .focus()
        .invoke('val')
        .then((inputVal) => {
          expect(inputVal).to.equal(clipVal);
        });
    });
  };

  beforeEach(() => {
    cy.mockFeatureFlags({ IS_INFORMATION_ARCHITECTURE_ENABLED: true });
    cy.initializeSession().as('session');

    // prevent repeated request
    cy.intercept('GET', 'https://clientstream.launchdarkly.com/**', {}).as('launchDarklyEval');
    cy.intercept('POST', 'https://events.launchdarkly.com/**', {}).as('launchDarklyEvents');
  });

  it('should have all elements in the original state', () => {
    const envName = 'Development';

    mockEnvs({ envName });
    launchTestPage();

    // title
    cy.contains('h1', 'Inbound parse webhook').should('exist');

    // status but no refresh button
    cy.contains('svg + p', 'Not claimed').should('exist');
    cy.get('button#refresh-status-button').should('not.exist');

    // validate the titles of the timeline
    cy.contains(`Specify a domain name for ${envName} environment`).should('exist');
    cy.contains(`Create a new MX record for ${envName} environment`).should('exist');
    cy.contains(`Assign MX record a priority`).should('exist');
    cy.contains(`Enable parse and set webhook URL`).should('exist');

    cy.get('form button[type="submit"]').should('be.disabled');
    cy.get('#inbound-parse-domain-input').should('have.value', '');
  });

  it('should handle the base / unclaimed flow', () => {
    const envName = 'Development';
    const testDomain = 'testing-cypress.novu.com';

    mockEnvs({ envName });
    launchTestPage();

    // status should be unclaimed
    cy.contains('svg + p', 'Not claimed').should('exist');
    cy.get('button#refresh-status-button').should('not.exist');

    // validate default form state
    cy.get('form button[type="submit"]').should('be.disabled');
    cy.get('#inbound-parse-domain-input').should('have.value', '');

    // attempt illegal character
    cy.get('#inbound-parse-domain-input').type(',' + testDomain);
    cy.get('form button[type="submit"]').should('be.enabled').click();

    // ensure invalid state is marked
    cy.get('#inbound-parse-domain-input').should('have.attr', 'aria-invalid').should('eq', 'true');
    cy.get('#inbound-parse-domain-input-error').should('exist');

    // clearing and re-entering should remove error
    cy.get('#inbound-parse-domain-input').clear().type(testDomain).blur();
    cy.get('#inbound-parse-domain-input').should('have.attr', 'aria-invalid').should('eq', 'false');
    cy.get('#inbound-parse-domain-input-error').should('not.exist');

    // submit form
    cy.get('form button[type="submit"]').should('be.enabled').click();

    // success message should appear
    cy.contains('Domain info updated successfully').should('exist');
  });

  it('should handle the pending state', () => {
    const envName = 'Development';
    const testDomain = 'testing-cypress.novu.com';

    mockEnvs({ envName, inboundParseDomain: testDomain });
    launchTestPage();

    cy.intercept('GET', '/v1/inbound-parse/mx/status', { data: { mxRecordConfigured: false } }).as('mx-status-pending');

    // validate form state
    cy.get('form button[type="submit"]').should('be.disabled');
    cy.get('#inbound-parse-domain-input').should('have.value', testDomain);

    // status should be pending with a refresh button
    cy.contains('svg + p', 'Pending').should('exist');
    cy.get('button#refresh-status-button').should('exist').should('be.enabled').click().should('be.disabled');
    cy.get('button#refresh-status-button').should('be.disabled');

    cy.wait('@mx-status-pending');

    cy.get('button#refresh-status-button').should('exist').should('be.enabled').click().should('be.disabled');
    cy.get('button#refresh-status-button').should('be.disabled');

    cy.intercept('GET', '/v1/inbound-parse/mx/status', { data: { mxRecordConfigured: true } }).as('mx-status-success');
    mockEnvs({ envName, inboundParseDomain: testDomain, mxRecordConfigured: true });
    cy.wait(['@mx-status-success', '@webhook-envs', '@webhook-current-env']);

    // claimed status should be reflected
    cy.contains('svg + p', 'Claimed').should('exist');
    cy.get('button#refresh-status-button').should('not.exist');
  });

  it('should handle the claimed state', () => {
    const envName = 'Development';
    const testDomain = 'testing-cypress.novu.com';

    mockEnvs({ envName, inboundParseDomain: testDomain, mxRecordConfigured: true });
    launchTestPage();

    // validate form state
    cy.get('form button[type="submit"]').should('be.disabled');
    cy.get('#inbound-parse-domain-input').should('have.value', testDomain);

    // status should be pending with a refresh button
    cy.contains('svg + p', 'Claimed').should('exist');
    cy.get('button#refresh-status-button').should('not.exist');
  });

  it('should copy the mail server info', () => {
    launchTestPage();
    cy.getByTestId('mail-server-domain').should('have.attr', 'readonly');
    testClipboardInput('mail-server-domain');
  });

  it('should have a documentation link', () => {
    launchTestPage();
    validateExternalLink({
      label: /^learn about.*/i,
      href: 'https://docs.novu.co/platform/inbound-parse-webhook',
    });
  });
});
