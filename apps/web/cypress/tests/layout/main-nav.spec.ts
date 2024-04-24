describe('Main Nav (Sidebar)', () => {
  /**
   * TODO: when Information Architecture is fully-enabled, the tests below should be merged
   * with the other describe block
   */
  describe('Legacy tests (Information Architecture disabled)', () => {
    beforeEach(() => {
      cy.mockFeatureFlags({ IS_INFORMATION_ARCHITECTURE_ENABLED: false });
      cy.initializeSession().as('session');
      cy.visit('/');
    });

    it('should navigate correctly to notification-templates', () => {
      cy.getByTestId('side-nav-templates-link').should('have.attr', 'href').should('include', '/workflows');
    });

    it('should show bottom support, docs and share feedback', () => {
      cy.getByTestId('side-nav-bottom-links').scrollIntoView().should('be.visible');
      cy.getByTestId('side-nav-bottom-link-support')
        .should('have.attr', 'href')
        .should('eq', 'https://discord.novu.co');
      cy.getByTestId('side-nav-bottom-link-documentation')
        .should('have.attr', 'href')
        .should('eq', 'https://docs.novu.co?utm_campaign=in-app');

      cy.getByTestId('side-nav-bottom-link-share-feedback')
        .should('have.attr', 'href')
        .should('eq', 'https://github.com/novuhq/novu/issues/new/choose');
    });

    // TODO: when Information Architecture is fully-enabled, this test can be removed (it's redundant).
    it('should navigate correctly to settings', function () {
      cy.getByTestId('side-nav-settings-link').should('have.attr', 'href').should('include', '/settings');
    });
  });

  describe('Information Architecture enabled', () => {
    beforeEach(() => {
      cy.mockFeatureFlags({ IS_INFORMATION_ARCHITECTURE_ENABLED: true });
      cy.initializeSession().as('session');
      cy.visit('/');
    });

    it('should render all navigation links', () => {
      // Check if all expected navigation links are present
      cy.getByTestId('side-nav-quickstart-link').should('exist');
      cy.getByTestId('side-nav-integrations-link').should('exist');
      cy.getByTestId('side-nav-settings-link').should('exist');
      cy.getByTestId('side-nav-templates-link').should('exist');
      cy.getByTestId('side-nav-activities-link').should('exist');
      cy.getByTestId('side-nav-changes-link').should('exist');
      cy.getByTestId('side-nav-subscribers-link').should('exist');
      cy.getByTestId('side-nav-tenants-link').should('exist');
      cy.getByTestId('side-nav-translations-link').should('exist');
    });

    it('should navigate to correct routes when clicking links', () => {
      // Check if clicking on a navigation link navigates to the correct route
      cy.getByTestId('side-nav-quickstart-link').click();
      cy.url().should('include', '/get-started');

      cy.getByTestId('side-nav-integrations-link').click();
      cy.url().should('include', '/integrations');

      cy.getByTestId('side-nav-settings-link').click();
      cy.url().should('include', '/settings');
    });

    it('should hide "Get started" link after clicking the visibility button', () => {
      // Click the visibility button next to the "Get started" link
      cy.getByTestId('side-nav-quickstart-link').should('exist').trigger('mouseover').find('button').click();

      // Check if the "Get started" link is no longer visible
      cy.getByTestId('side-nav-quickstart-link').should('not.exist');
    });

    it('should display settings menu when navigating to settings page', () => {
      // Navigate to the settings page
      cy.getByTestId('side-nav-settings-link').click();

      // Check if the settings menu is displayed
      cy.getByTestId('side-nav-settings-user-profile').should('exist');
      cy.getByTestId('side-nav-settings-organization-link').should('exist');
      cy.getByTestId('side-nav-settings-security-link').should('exist');
      cy.getByTestId('side-nav-settings-team-link').should('exist');
      cy.getByTestId('side-nav-settings-branding-link').should('exist');
      cy.getByTestId('side-nav-settings-billing-link').should('exist');
      cy.getByTestId('side-nav-settings-api-keys').should('exist');
      cy.getByTestId('side-nav-settings-inbound-webhook').should('exist');
      /** TODO: we will reinstate the toggle buttons w/ different envs once we have APIs to support the pages */
      // cy.getByTestId('side-nav-settings-toggle-development').should('exist');
      // cy.getByTestId('side-nav-settings-toggle-production').should('exist');
    });

    /** TODO: we will reinstate the toggle buttons w/ different envs once we have APIs to support the pages */
    it.skip('should display correct environment settings when toggling development/production', () => {
      // Navigate to the settings page
      cy.getByTestId('side-nav-settings-link').click();

      // Toggle development environment
      cy.getByTestId('side-nav-settings-toggle-development').click();
      cy.getByTestId('side-nav-settings-api-keys-development').should('exist');
      cy.getByTestId('side-nav-settings-inbound-webhook-development').should('exist');

      // Toggle production environment
      cy.getByTestId('side-nav-settings-toggle-production').click();
      cy.getByTestId('side-nav-settings-api-keys-production').should('exist');
      cy.getByTestId('side-nav-settings-inbound-webhook-production').should('exist');
    });
  });
});
