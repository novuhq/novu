import * as capitalize from 'lodash.capitalize';

describe('Invites module', function () {
  beforeEach(function () {
    cy.task('clearDatabase');
    cy.inviteUser('testing-amazing@user.com');
  });

  it('should accept invite to organization', function () {
    doRegister(this.token);

    cy.getByTestId('header-profile-avatar').click();
    cy.getByTestId('header-dropdown-organization-name').contains(capitalize(this.organization.name.split(' ')[0]));
  });

  /**
   * TODO: fix failing test
   */
  it.skip('should login if already existing user', function () {
    doRegister(this.token);

    cy.inviteUser('testing-amazing@user.com').then(() => {
      cy.visit('/auth/invitation/' + this.token);

      cy.getByTestId('email').should('have.value', 'testing-amazing@user.com');
      cy.getByTestId('password').type('asd#Faf4fd');
      cy.getByTestId('submit-btn').click();

      cy.url().should('include', '/templates');

      cy.getByTestId('header-profile-avatar').click();
      cy.getByTestId('organization-switch').focus();
      cy.get('.mantine-Select-item').contains(capitalize(this.organization.name)).click();
    });
  });

  it('should also accept invite if already logged in with right user', function () {
    doRegister(this.token);
    cy.inviteUser('testing-amazing@user.com').then(() => {
      doLogin('testing-amazing@user.com', 'asd#Faf4fd');

      cy.visit('/auth/invitation/' + this.token);

      cy.url().should('include', '/templates');

      cy.getByTestId('header-profile-avatar').click();
      cy.getByTestId('organization-switch').focus();
      cy.get('.mantine-Select-item').contains(capitalize(this.organization.name)).click({ force: true });
    });
  });

  it('should redirect to invitation page again if invitation open with an active user session', function () {
    cy.initializeSession().as('session');

    const invitationPath = `/auth/invitation/${this.token}`;
    cy.visit(invitationPath);
    cy.getByTestId('success-screen-reset').click();

    // checking if token is removed from local storage
    cy.getLocalStorage('auth_token').should('be.null');
    // checking if user is redirected to the given invitation page
    cy.location('pathname').should('equal', invitationPath);
  });
});

function doRegister(token: string) {
  cy.visit('/auth/invitation/' + token);
  cy.getByTestId('fullName').type('Invited to org user');
  cy.getByTestId('password').type('asd#Faf4fd');
  cy.getByTestId('accept-cb').click();
  cy.getByTestId('submitButton').click();

  cy.url().should('include', '/templates');
}

function doLogin(email: string, password: string) {
  cy.visit('/auth/login');
  cy.getByTestId('email').type(email);
  cy.getByTestId('password').type(password);
  cy.getByTestId('submit-btn').click();

  cy.url().should('include', '/templates');
}
