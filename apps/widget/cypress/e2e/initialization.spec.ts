describe('Initialization', function () {
  beforeEach(function () {
    cy.intercept('**/widgets/session/initialize**').as('sessionInitialize');
    cy.initializeSession();
    cy.waitForNetworkIdle(500);
  });

  it('should initialize a session', function () {
    cy.wait('@sessionInitialize');
    cy.window().then((w) => {
      expect(w.localStorage.getItem('widget_user_auth_token')).to.be.ok;
      return null;
    });
  });
});

describe('Initialization with enabled HMAC encryption', function () {
  it('should initialize encrypted session with the help of HMAC hash', function () {
    cy.intercept('**/widgets/session/initialize**').as('sessionInitialize');
    cy.initializeSession({ hmacEncryption: true });
    cy.wait('@sessionInitialize');
    cy.window().then((w) => {
      expect(w.localStorage.getItem('widget_user_auth_token')).to.be.ok;
      return null;
    });
  });
});

describe('Initialization with enabled HMAC encryption in shell', function () {
  it('should initialize encrypted session with the help of HMAC hash shell', function () {
    cy.intercept('**/widgets/session/initialize**').as('sessionInitialize');
    cy.initializeSession({ shell: true, hmacEncryption: true })
      .as('session')
      .then((session: any) => {
        cy.wait(500);
        Cypress.config('baseUrl', 'http://127.0.0.1:3500');
        const WidgetURL = `http://127.0.0.1:3500/${session.environment.identifier}`;
        return cy.forceVisit(WidgetURL);
      });
    cy.wait('@sessionInitialize', {
      timeout: 60000,
    });
    cy.waitForNetworkIdle(500);

    cy.window().then((w) => {
      expect(w.localStorage.getItem('widget_user_auth_token')).to.be.ok;
      return null;
    });
  });
});
