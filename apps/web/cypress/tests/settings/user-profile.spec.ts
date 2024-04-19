describe('User Profile Settings Page', () => {
  describe('Set Password Flow', () => {
    const USER_DATA = {
      email: 'testing@test.com',
      hasPassword: false,
    };

    beforeEach(() => {
      cy.mockFeatureFlags({ IS_INFORMATION_ARCHITECTURE_ENABLED: true });
      cy.initializeSession().as('session');

      cy.intercept('GET', '/v1/users/me', {
        data: USER_DATA,
      }).as('userInfo');

      // don't send actual reset request to avoid spamming the server
      cy.intercept('POST', '/v1/auth/reset/request?src=USER_PROFILE').as('passwordResetRequest');

      cy.intercept('POST', '/v1/auth/reset', {
        data: {
          token: 'testToken',
        },
      }).as('passwordResetSetPassword');

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
      cy.contains('h2', 'Set password').should('exist');

      // timer
      cy.contains('strong', /\d{1,2}/).should('exist');

      cy.contains('button', 'Resend link').should('exist').should('be.disabled');

      cy.getByTestId('sidebar-close').click();

      // ensure sidebar state is removed from the URL on close
      cy.url().should('not.include', 'view=password');
      cy.contains('div > form h2', 'Set password').should('not.exist');
    });

    it('should handle password entry as if redirected from a verification email', () => {
      cy.visit('/settings/profile?view=password&token=abc123');

      // sidebar title
      cy.contains('h2', 'Set password').should('exist');

      cy.get('form#set-password-form button[type="submit"]').should('be.disabled');

      const password = 'hell0MyFriends!';

      // blur is required due to the Password Strength popover
      cy.getByTestId('password').should('exist').type(password).blur();
      cy.getByTestId('password-repeat')
        .should('exist')
        .type(password + 'blah');

      cy.get('form#set-password-form button[type="submit"]').should('not.be.disabled').click();

      // ensure at least one field is marked as error
      cy.get('div [aria-invalid="true"] input[type="password"]').should('have.length.at.least', 1);

      cy.getByTestId('password-repeat').clear().type(password);

      cy.get('form#set-password-form button[type="submit"]').should('not.be.disabled');
    });
  });

  describe('Update Password Flow', () => {
    const USER_DATA = {
      email: 'testing@test.com',
      hasPassword: true,
    };

    beforeEach(() => {
      cy.mockFeatureFlags({ IS_INFORMATION_ARCHITECTURE_ENABLED: true });
      cy.initializeSession().as('session');

      cy.intercept('GET', '/v1/users/me', {
        data: USER_DATA,
      }).as('userInfo');

      // don't send actual reset request to avoid spamming the server
      cy.intercept('POST', '/v1/auth/reset/request?src=USER_PROFILE').as('passwordResetRequest');

      cy.intercept('POST', '/v1/auth/update-password', {
        data: {},
      }).as('passwordResetUpdatePassword');
    });

    it('should render the page elements', () => {
      cy.visit('/settings/profile');

      cy.get('h1').contains('User profile');
      cy.get('h2').contains('Profile security');
      cy.get('button').contains('Update password').should('exist');
    });

    it('should be able to open the Update password sidebar and fill-out the form', () => {
      cy.visit('/settings/profile');

      cy.get('button').contains('Update password').click();

      // ensure sidebar state is persisted in the URL
      cy.url().should('include', 'view=password');

      // sidebar title
      cy.contains('h2', 'Update password').should('exist');
      // ensure at least one field is marked as error
      cy.get('form div > input[type="password"]').should('have.length', 3);

      cy.get('form#reset-password-form button[type="submit"]').should('be.disabled');

      const currentPassword = 'MyFriends,hell0!';
      const password = 'hell0MyFriends!';

      cy.getByTestId('password-current').should('exist').type(currentPassword);
      // blur is required due to the Password Strength popover
      cy.getByTestId('password-new').should('exist').type(password).blur();
      cy.getByTestId('password-confirm')
        .should('exist')
        .type(password + 'blah');

      cy.get('form#reset-password-form button[type="submit"]').should('not.be.disabled').click();

      // ensure at least one field is marked as error
      cy.get('div [aria-invalid="true"] input[type="password"]').should('have.length.at.least', 1);

      cy.getByTestId('password-confirm').clear().type(password);

      cy.get('form#reset-password-form button[type="submit"]').should('not.be.disabled');
    });
  });
});
