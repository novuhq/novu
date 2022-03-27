describe('Settings Screen', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
    cy.visit('/settings');
    cy.intercept('*/channels/email/settings').as('updateEmailSettings');
    cy.intercept('*/channels/sms/settings').as('updateSmsSettings');
    cy.intercept('*/applications/branding').as('updateBrandingSettings');
  });

  it('should display the embed code successfully', function () {
    cy.get('.mantine-Tabs-tabsList').contains('In App Center').click();

    cy.getByTestId('embed-code-snippet').then(function (a) {
      expect(a).to.contain(this.session.application.identifier);
      expect(a).to.contain('notifire.init');
    });
  });

  it('should display the api key of the app', function () {
    cy.get('.mantine-Tabs-tabsList').contains('Api Keys').click();
    cy.getByTestId('api-key-container').should('have.value', this.session.application.apiKeys[0].key);
  });

  it('should update logo', function () {
    cy.fixture('test-logo.png', { encoding: null }).then((contents) => {
      cy.getByTestId('upload-image-button').find('input').selectFile(
        {
          contents,
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
    cy.getByTestId('color-picker').should('have.value', '#b967c7');
    cy.getByTestId('color-picker').click({ force: true });
    cy.get('div[aria-valuetext="rgba(185, 103, 199, 1)"]');
    cy.get('body').click();

    /* cy.getByTestId('font-color-picker').click({ force: true });
     cy.get('button[aria-label="#37D67A"]').click({ force: true });
     cy.getByTestId('font-color-picker').click({ force: true });
     cy.get('div[aria-valuetext="rgba(56, 214, 122, 1)"]');
     cy.get('body').click();
     */

    cy.getByTestId('content-background-picker').click({ force: true });
    cy.get('button[aria-label="#2CCCE4"]').click({ force: true });
    cy.getByTestId('content-background-picker').click({ force: true });
    cy.get('div[aria-valuetext="rgba(43, 202, 227, 1)"]');
    cy.get('body').click();

    cy.getByTestId('font-family-selector').click({ force: true });
    cy.get('.mantine-Select-dropdown .mantine-Select-item').contains('Lato').click();
    cy.getByTestId('font-family-selector').should('have.value', 'Lato');

    cy.getByTestId('submit-branding-settings').click({ force: true });
    cy.wait('@updateBrandingSettings');

    cy.reload();
    cy.getByTestId('color-picker').should('have.value', '#b967c7');
    /* cy.getByTestId('font-color-picker').should('have.value', '#0eb554'); */
    cy.getByTestId('content-background-picker').should('have.value', '#2bcae3');
    cy.getByTestId('font-family-selector').should('have.value', 'Lato');
  });
});
