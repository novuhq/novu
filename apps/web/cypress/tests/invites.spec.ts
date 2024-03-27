import * as capitalize from 'lodash.capitalize';

describe('Invites module', function () {
  beforeEach(function () {
    cy.task('clearDatabase');
  });

  it('should accept invite to organization', function () {
    cy.inviteUser('testing-amazing@user.com').then(() => {
      doRegister(this.token);

      cy.getByTestId('header-profile-avatar').click();
      cy.getByTestId('header-dropdown-organization-name').contains(capitalize(this.organization.name.split(' ')[0]));
    });
  });

  it.skip('should allow to login with GitHub if invited existing user', function () {
    const isCI = Cypress.env('IS_CI');
    if (!isCI) return;

    const gitHubUserEmail = Cypress.env('GITHUB_USER_EMAIL');

    cy.inviteUser(gitHubUserEmail).then(() => {
      cy.visit('/auth/invitation/' + this.token);

      cy.getByTestId('auth-container-title').contains('Get Started');
      cy.getByTestId('invitation-description').then((el) => {
        cy.then(() => el.text()).should(
          'equal',
          `You've been invited by ${this.inviter.firstName} to join ${this.organization.name}.`
        );
      });

      cy.loginWithGitHub();

      cy.url().should('include', '/workflows');
    });
  });

  it.skip('invite a new user, sign up a new account with GitHub and then accept an invite', function () {
    const isCI = Cypress.env('IS_CI');
    if (!isCI) return;

    const gitHubUserEmail = Cypress.env('GITHUB_USER_EMAIL');

    cy.inviteUser(gitHubUserEmail).then(() => {
      cy.visit('/auth/signup');
      cy.loginWithGitHub();

      cy.location('pathname').should('equal', '/auth/application');
      cy.getByTestId('questionnaire-company-name').type('Organization Name');
      cy.getByTestId('submit-btn').click();
      cy.url().should('include', '/quickstart');

      // check if user is logged in
      cy.getByTestId('header-profile-avatar').click();
      cy.getByTestId('header-dropdown-organization-name').contains(capitalize('Organization Name'.split(' ')[0]));
      cy.getByTestId('header-dropdown-username').contains('Johnny Depp');

      // logout
      cy.getByTestId('logout-button').click();

      // visit invite link
      cy.visit('/auth/invitation/' + this.token);

      // check the invite page
      cy.getByTestId('auth-container-title').contains('Sign In & Accept Invite');
      cy.getByTestId('invitation-description').then((el) => {
        cy.then(() => el.text()).should(
          'equal',
          `You've been invited by ${this.inviter.firstName} to join ${this.organization.name}.`
        );
      });
      cy.getByTestId('github-button').click();

      cy.url().should('include', '/workflows');
    });
  });

  it('should allow to login if invited new user', function () {
    cy.inviteUser('testing-amazing@user.com').then(() => {
      doRegister(this.token);
    });

    cy.inviteUser('testing-amazing@user.com').then(() => {
      cy.visit('/auth/invitation/' + this.token);

      cy.getByTestId('email').should('have.value', 'testing-amazing@user.com');
      cy.getByTestId('password').type('asd#Faf4fd');
      cy.getByTestId('submit-btn').click();

      cy.url().should('include', '/workflows');

      cy.getByTestId('header-profile-avatar').click();
      cy.getByTestId('organization-switch').focus();
      cy.get('.mantine-Select-item').contains(capitalize(this.organization.name)).click();
    });
  });

  it('should also accept invite if already logged in with right user', function () {
    cy.inviteUser('testing-amazing@user.com').then(() => {
      doRegister(this.token);
    });

    cy.inviteUser('testing-amazing@user.com').then(() => {
      doLogin('testing-amazing@user.com', 'asd#Faf4fd');

      cy.visit('/auth/invitation/' + this.token);

      cy.url().should('include', '/workflows');

      cy.getByTestId('header-profile-avatar').click();
      cy.getByTestId('organization-switch').focus();
      cy.get('.mantine-Select-item').contains(capitalize(this.organization.name)).click({ force: true });
    });
  });

  it('should redirect to invitation page again if invitation open with an active user session', function () {
    cy.inviteUser('testing-amazing@user.com').then(() => {
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
});

function doRegister(token: string) {
  cy.visit('/auth/invitation/' + token);
  cy.getByTestId('fullName').type('Invited to org user');
  cy.getByTestId('password').type('asd#Faf4fd');
  cy.getByTestId('accept-cb').click({ force: true });
  cy.getByTestId('submitButton').click();

  cy.url().should('include', '/workflows');
}

function doLogin(email: string, password: string) {
  cy.visit('/auth/login');
  cy.getByTestId('email').type(email);
  cy.getByTestId('password').type(password);
  cy.getByTestId('submit-btn').click();

  cy.url().should('include', '/workflows');
}
