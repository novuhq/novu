const USER_DATA = {
  email: 'testing@test.com',
  hasPassword: false,
};

describe('User Profile Settings Page', () => {
  describe('Set Password Flow', () => {
    beforeEach(() => {
      cy.mockFeatureFlags({ IS_INFORMATION_ARCHITECTURE_ENABLED: true });
      cy.initializeSession().as('session');

      cy.intercept('GET', '/v1/users/me', {
        data: USER_DATA,
      }).as('userInfo');

      // don't send actual reset request to avoid spamming the server
      cy.intercept('POST', '/v1/auth/reset/request?src=USER_PROFILE').as('passwordResetRequest');

      // prevent repeated request
      cy.intercept('GET', 'https://clientstream.launchdarkly.com/**', {}).as('launchDarklyEval');
      cy.intercept('POST', 'https://events.launchdarkly.com/**', {}).as('launchDarklyEvents');
    });

    it('should render the page elements', () => {
      cy.visit('/settings/profile');

      cy.get('h1').contains('User profile');
      cy.get('h2').contains('Profile security');
      cy.get('button').contains('Set password').should('exist');
    });

    it('should open and validate the sidebar for the non-token flow', () => {
      cy.visit('/settings/profile');

      cy.get('button').contains('Set password').click();

      // ensure sidebar state is persisted in the URL
      cy.url().should('include', 'view=password');

      // sidebar title
      cy.contains('div > form h2', 'Set password').should('exist');

      // timer
      cy.contains('strong', /\d{1,2}/).should('exist');

      cy.contains('button', 'Resend link').should('exist').should('be.disabled');

      cy.getByTestId('sidebar-close').click();

      // ensure sidebar state is removed from the URL on close
      cy.url().should('not.include', 'view=password');
      cy.contains('div > form h2', 'Set password').should('not.exist');
    });

    it('should validate loading the page as if redirected from the verification email', () => {
      cy.visit('/settings/profile?view=password&token=abc123');

      // sidebar title
      cy.contains('div > form h2', 'Set password').should('exist');

      cy.get('button[type="submit"]').should('be.disabled');

      const password = 'hell0MyFriends!';
      cy.getByTestId('password').should('exist').type(password).blur();
      cy.getByTestId('password-repeat')
        .should('exist')
        .type(password + 'blah');

      cy.get('button[type="submit"]').should('not.be.disabled');

      cy.getByTestId('sidebar-close').click();

      // ensure sidebar is closed and the state is removed from the URL
      cy.url().should('not.include', 'view=password');
      cy.contains('div > form h2', 'Set password').should('not.exist');
    });
  });
});
