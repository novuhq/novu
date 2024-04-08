import * as capitalize from 'lodash.capitalize';
import { JobTitleEnum, jobTitleToLabelMapper } from '@novu/shared';

describe('User Sign-up and Login', function () {
  describe('Sign up', function () {
    beforeEach(function () {
      cy.clearDatabase();
      cy.seedDatabase();
    });

    it('should allow a visitor to sign-up, login, and logout', function () {
      cy.intercept('**/organization/**/switch').as('appSwitch');
      cy.visit('/auth/signup');
      cy.getByTestId('fullName').type('Test User');
      cy.getByTestId('email').type('example@example.com');
      cy.getByTestId('password').type('usEr_password_123!');
      cy.getByTestId('accept-cb').click({ force: true });

      cy.getByTestId('submitButton').click();

      cy.location('pathname').should('equal', '/auth/application');
      cy.getByTestId('questionnaire-job-title').click();
      cy.get('.mantine-Select-item').contains(jobTitleToLabelMapper[JobTitleEnum.PRODUCT_MANAGER]).click();
      cy.getByTestId('questionnaire-company-name').type('Company Name');
      cy.getByTestId('check-box-container-multi_channel').trigger('mouseover').click();

      cy.getByTestId('submit-btn').click();

      cy.location('pathname').should('equal', '/get-started');
    });

    it('should show account already exists when signing up with already registered mail', function () {
      cy.visit('/auth/signup');
      cy.getByTestId('fullName').type('Test User');
      cy.getByTestId('email').type('test-user-1@example.com');
      cy.getByTestId('password').type('usEr_password_123!');
      cy.getByTestId('accept-cb').click({ force: true });
      cy.getByTestId('submitButton').click();
      cy.get('.mantine-TextInput-error').contains('An account with this email already exists');
    });

    it('should show invalid email error when signing up with invalid email', function () {
      cy.visit('/auth/signup');
      cy.getByTestId('fullName').type('Test User');
      cy.getByTestId('email').type('test-user-1@example.c');
      cy.getByTestId('password').type('usEr_password_123!');
      cy.getByTestId('accept-cb').click({ force: true });
      cy.getByTestId('submitButton').click();
      cy.get('.mantine-TextInput-error').contains('Please provide a valid email');
    });

    it.skip('should allow to sign-up with GitHub, logout, and login', function () {
      const isCI = Cypress.env('IS_CI');
      if (!isCI) return;

      cy.intercept('**/organization/**/switch').as('appSwitch');
      cy.visit('/auth/signup');

      cy.loginWithGitHub();

      cy.location('pathname').should('equal', '/auth/application');
      cy.getByTestId('questionnaire-company-name').type('Organization Name');
      cy.getByTestId('submit-btn').click();

      cy.location('pathname').should('equal', '/quickstart');
      cy.getByTestId('header-profile-avatar').click();
      cy.getByTestId('header-dropdown-organization-name').contains(capitalize('Organization Name'.split(' ')[0]));
      cy.getByTestId('header-dropdown-username').contains('Johnny Depp');

      cy.getByTestId('logout-button').click();
      cy.getByTestId('github-button').click();

      cy.location('pathname').should('equal', '/workflows');
      cy.getByTestId('header-profile-avatar').click();
      cy.getByTestId('header-dropdown-username').contains('Johnny Depp');
    });

    it.skip('should allow to sign-up, logout, and login with GitHub using same email address', function () {
      const isCI = Cypress.env('IS_CI');
      if (!isCI) return;

      const gitHubUserEmail = Cypress.env('GITHUB_USER_EMAIL');

      cy.intercept('**/organization/**/switch').as('appSwitch');
      cy.visit('/auth/signup');
      cy.getByTestId('fullName').type('Test User');
      cy.getByTestId('email').type(gitHubUserEmail);
      cy.getByTestId('password').type('usEr_password_123!');
      cy.getByTestId('accept-cb').click({ force: true });
      cy.getByTestId('submitButton').click();

      cy.location('pathname').should('equal', '/auth/application');
      cy.getByTestId('questionnaire-company-name').type('Organization Name');
      cy.getByTestId('submit-btn').click();

      cy.location('pathname').should('equal', '/quickstart');
      cy.getByTestId('header-profile-avatar').click();
      cy.getByTestId('header-dropdown-username').contains('Test User');
      cy.getByTestId('logout-button').click();

      cy.location('pathname').should('equal', '/auth/login');
      cy.loginWithGitHub();

      cy.location('pathname').should('equal', '/workflows');
      cy.getByTestId('header-profile-avatar').click();
      cy.getByTestId('header-dropdown-username').contains('Test User');
    });
  });

  describe('Password Reset', function () {
    before(() => {
      cy.clearDatabase();
      cy.seedDatabase();
      cy.initializeSession().as('session');
    });

    it('should request a password reset flow', function () {
      cy.visit('/auth/reset/request');
      cy.getByTestId('email').type(this.session.user.email);
      cy.getByTestId('submit-btn').click();
      cy.getByTestId('success-screen-reset').should('be.visible');
      cy.task('passwordResetToken', this.session.user._id).then((token) => {
        cy.visit('/auth/reset/' + token);
      });
      cy.getByTestId('password').type('A123e3e3e3!');
      cy.getByTestId('password-repeat').focus().type('A123e3e3e3!');

      cy.getByTestId('submit-btn').click();
    });
  });

  describe('Login', function () {
    beforeEach(() => {
      cy.clearDatabase();
      cy.seedDatabase();
    });

    it('should redirect to the dashboard page when a token exists in query', function () {
      cy.initializeSession({ disableLocalStorage: true }).then((session) => {
        cy.visit('/auth/login?token=' + session.token);
        cy.location('pathname').should('equal', '/workflows');
      });
    });

    it('should be redirect login with no auth', function () {
      cy.visit('/');
      cy.location('pathname').should('equal', '/auth/login');
    });

    it('should successfully login the user', function () {
      cy.visit('/auth/login');

      cy.getByTestId('email').type('test-user-1@example.com');
      cy.getByTestId('password').type('123qwe!@#');
      cy.getByTestId('submit-btn').click();
      cy.location('pathname').should('equal', '/workflows');
    });

    it('should show incorrect email or password error when authenticating with bad credentials', function () {
      cy.visit('/auth/login');

      cy.getByTestId('email').type('test-user-1@example.com');
      cy.getByTestId('password').type('123456');
      cy.getByTestId('submit-btn').click();
      cy.get('.mantine-TextInput-error').contains('Incorrect email or password provided');
    });

    it('should show invalid email error when authenticating with invalid email', function () {
      cy.visit('/auth/login');

      cy.getByTestId('email').type('test-user-1@example.c');
      cy.getByTestId('password').type('123456');
      cy.getByTestId('submit-btn').click();
      cy.get('.mantine-TextInput-error').contains('Please provide a valid email');
    });

    it('should show incorrect email or password error when authenticating with non-existing email', function () {
      cy.visit('/auth/login');

      cy.getByTestId('email').type('test-user-1@example.de');
      cy.getByTestId('password').type('123456');
      cy.getByTestId('submit-btn').click();
      cy.get('.mantine-TextInput-error').contains('Incorrect email or password provided');
    });
  });

  describe('Logout', function () {
    beforeEach(function () {
      cy.clearDatabase();
      cy.seedDatabase();
    });

    it('should logout user when auth token is expired', function () {
      // login the user
      cy.visit('/auth/login');
      cy.getByTestId('email').type('test-user-1@example.com');
      cy.getByTestId('password').type('123qwe!@#');
      cy.getByTestId('submit-btn').click();

      cy.location('pathname').should('equal', '/workflows');

      // setting current time in future, to simulate expired token
      const ONE_MINUTE = 1000 * 60; // adding 1 minute to be sure that token is expired
      const THIRTY_DAYS = ONE_MINUTE * 60 * 24 * 30; // iat - exp = 30 days
      const date = new Date(Date.now() + THIRTY_DAYS + ONE_MINUTE);
      cy.clock(date);

      cy.visit('/subscribers');

      // checking if token is removed from local storage
      cy.getLocalStorage('auth_token').should('be.null');
      // checking if user is redirected to login page
      cy.location('pathname').should('equal', '/auth/login');
    });
  });
});
