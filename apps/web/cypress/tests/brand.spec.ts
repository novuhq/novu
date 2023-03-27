describe('Brand Screen', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
    cy.visit('/brand');
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
    cy.getByTestId('submit-branding-settings').click();

    cy.getByTestId('logo-image-wrapper').should('have.attr', 'src').should('include', '.png');
    cy.getByTestId('logo-image-wrapper').should('have.attr', 'src').should('include', this.session.organization._id);
  });

  it('should change look and feel settings', function () {
    cy.getByTestId('color-picker').click({ force: true });
    cy.get('button[aria-label="#BA68C8"]').click();
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
