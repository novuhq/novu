describe('Initialization', function () {
  beforeEach(function () {
    cy.intercept('**/widgets/session/initialize**').as('sessionInitialize');
    cy.initializeSession();
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
  beforeEach(function () {
    cy.intercept('**/widgets/session/initialize**').as('sessionInitialize');
    cy.initializeSession({ hmacEncryption: true });
  });

  it('should initialize encrypted session with the help of HMAC hash', function () {
    cy.wait('@sessionInitialize');
    cy.window().then((w) => {
      expect(w.localStorage.getItem('widget_user_auth_token')).to.be.ok;
      return null;
    });
  });
});

describe('Initialization with enabled HMAC encryption in shell', function () {
  beforeEach(function () {
    cy.intercept('**/widgets/session/initialize**').as('sessionInitialize');
    cy.initializeSession({ shell: true, hmacEncryption: true })
      .as('session')
      .then((session: any) => {
        cy.wait(500);
        Cypress.config('baseUrl', 'http://localhost:3500');
        const WidgetURL = `http://localhost:3500/${session.environment.identifier}`;
        return cy.forceVisit(WidgetURL);
      });
  });

  it('should initialize encrypted session with the help of HMAC hash', function () {
    cy.wait('@sessionInitialize');

    cy.window().then((w) => {
      expect(w.localStorage.getItem('widget_user_auth_token')).to.be.ok;
      return null;
    });
  });
});
