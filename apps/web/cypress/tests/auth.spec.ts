import { MemberRoleEnum } from '@notifire/shared';

describe('User Sign-up and Login', function () {
  describe('Sign up', function () {
    beforeEach(function () {
      cy.task('clearDatabase');
      cy.seed();
    });

    it('should allow a visitor to sign-up, login, and logout', function () {
      cy.visit('/auth/signup');
      cy.getByTestId('fullName').type('Test User');
      cy.getByTestId('email').type('example@example.com');
      cy.getByTestId('password').type('usEr_password_123');
      cy.getByTestId('companyName').type('Mega Corp Company');
      cy.getByTestId('submitButton').click();
      cy.location('pathname').should('equal', '/templates');
    });
  });

  describe('Password Reset', function () {
    before(() => {
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
      cy.getByTestId('password').type('123e3e3e3');
      cy.getByTestId('password-repeat').type('123e3e3e3');

      cy.getByTestId('submit-btn').click();
    });
  });

  describe('Login', function () {
    beforeEach(function () {
      cy.task('clearDatabase');
      cy.seed();
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
      cy.location('pathname').should('equal', '/templates');
    });

    it('should show bad password error when authenticating with bad credentials', function () {
      cy.visit('/auth/login');

      cy.getByTestId('email').type('test-user-1@example.com');
      cy.getByTestId('password').type('123456');
      cy.getByTestId('submit-btn').click();
      cy.getByTestId('error-alert-banner').contains('Wrong credentials');
    });
  });
});
