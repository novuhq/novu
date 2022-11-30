describe('Settings Screen', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
    cy.visit('/settings');
    cy.intercept('*/channels/email/settings').as('updateEmailSettings');
    cy.intercept('*/channels/sms/settings').as('updateSmsSettings');
    cy.intercept('*/organizations/branding').as('updateBrandingSettings');
  });

  it('should display the embed code successfully', function () {
    cy.get('.mantine-Tabs-tabsList').contains('In App Center').click();

    cy.getByTestId('embed-code-snippet').then(function (a) {
      expect(a).to.contain(this.session.environment.identifier);
      expect(a).to.contain('novu.init');
    });
  });

  it('should display the api key of the app', function () {
    cy.get('.mantine-Tabs-tabsList').contains('API Keys').click();
    cy.getByTestId('api-key-container').should('have.value', this.session.environment.apiKeys[0].key);
  });

  it('should update logo', function () {
    cy.fixture('test-logo.png', {}).then((contents) => {
      cy.getByTestId('upload-image-button')
        .find('input')
        .selectFile(
          {
            contents: Buffer.from(contents),
            fileName: 'test-logo.png',
            mimeType: 'image/png',
          },
          { force: true }
        );
    });
    cy.getByTestId('logo-image-wrapper').should('have.attr', 'src').should('include', '.png');

    cy.getByTestId('logo-image-wrapper').should('have.attr', 'src').should('include', this.session.organization._id);
    cy.getByTestId('submit-branding-settings').click();

    cy.getByTestId('logo-image-wrapper').should('have.attr', 'src').should('include', '.png');
    cy.getByTestId('logo-image-wrapper').should('have.attr', 'src').should('include', this.session.organization._id);
  });

  it('should change look and feel settings', function () {
    cy.getByTestId('color-picker').click({ force: true });
    cy.get('button[aria-label="#BA68C8"]').click({ force: true });
    cy.getByTestId('color-picker').should('have.value', '#BA68C8');
    cy.getByTestId('color-picker').click({ force: true });
    cy.get('div[aria-valuetext="rgba(185, 103, 199, 1)"]');
    cy.get('body').click();

    cy.getByTestId('font-family-selector').click({ force: true });
    cy.get('.mantine-Select-dropdown .mantine-Select-item').contains('Lato').click();
    cy.getByTestId('font-family-selector').should('have.value', 'Lato');

    cy.getByTestId('submit-branding-settings').click({ force: true });
    cy.wait('@updateBrandingSettings');

    cy.reload();
    cy.getByTestId('color-picker').should('have.value', '#BA68C8');
    cy.getByTestId('font-family-selector').should('have.value', 'Lato');
  });
});
