describe('Organization Brand Screen', function () {
  beforeEach(function () {
    cy.mockFeatureFlags({ IS_INFORMATION_ARCHITECTURE_ENABLED: true });
    cy.initializeSession().as('session');
    cy.visit('settings/brand');
    cy.intercept('*/organizations/branding').as('updateBrandingSettings');
  });

  it('should update logo', function () {
    cy.intercept('*/storage/upload-url*').as('uploadLogo');

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

    cy.wait('@uploadLogo');

    cy.getByTestId('logo-image-wrapper').should('have.attr', 'src').should('include', '.png');

    cy.getByTestId('logo-image-wrapper').should('have.attr', 'src').should('include', this.session.organization._id);
    cy.getByTestId('font-color-picker').click({ force: true });
    cy.get('button[aria-label="#BA68C8"]').click();
    cy.get('body').click();
    cy.getByTestId('submit-branding-settings').click();

    cy.getByTestId('logo-image-wrapper').should('have.attr', 'src').should('include', '.png');
    cy.getByTestId('logo-image-wrapper').should('have.attr', 'src').should('include', this.session.organization._id);
  });

  it('should change look and feel settings', function () {
    cy.getByTestId('font-color-picker').click({ force: true });
    cy.get('button[aria-label="#BA68C8"]').click();
    cy.getByTestId('font-color-picker').should('have.value', '#BA68C8');
    cy.getByTestId('font-color-picker').click({ force: true });

    cy.get('body').click();

    cy.getByTestId('font-family-selector').should('have.value', 'Montserrat');
    cy.getByTestId('font-family-selector').click({ force: true });
    cy.get('.mantine-Select-dropdown .mantine-Select-item').contains('Lato').click();
    cy.getByTestId('font-family-selector').should('have.value', 'Lato');

    cy.getByTestId('brand-color-picker').click({ force: true });
    cy.get('button[aria-label="#f47373"]').click();
    cy.getByTestId('brand-color-picker').should('have.value', '#f47373');
    cy.getByTestId('brand-color-picker').click({ force: true });

    cy.get('body').click();

    cy.getByTestId('submit-branding-settings').click({ force: true });
    cy.wait('@updateBrandingSettings');

    cy.reload();
    cy.getByTestId('brand-color-picker').should('have.value', '#f47373');
    cy.getByTestId('font-color-picker').should('have.value', '#BA68C8');
    cy.getByTestId('font-family-selector').should('have.value', 'Lato');
  });
});
