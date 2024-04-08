describe('Organization Page', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
    cy.visit('/settings/organization');
    cy.intercept('*/organizations/branding').as('updateOrganization');
    cy.intercept('*/organizations').as('renameOrganization');
  });

  it('should update logo', function () {
    cy.intercept('*/storage/upload-url*').as('uploadLogo');

    cy.fixture('test-logo.png', {}).then((contents) => {
      cy.getByTestId('image-input-container')
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
    cy.waitForNetworkIdle(500);
    cy.getByTestId('preview-img').should('have.attr', 'src').should('include', '.png');
    cy.getByTestId('preview-img').should('have.attr', 'src').should('include', this.session.organization._id);
  });

  it('update the organization name', function () {
    cy.getByTestId('organization-name-input').should('have.value', this.session.organization.name);
    cy.getByTestId('organization-name-input').clear().type('New Name');
    cy.getByTestId('organization-update-button').click();

    cy.wait('@renameOrganization');

    cy.reload();
    cy.getByTestId('organization-name-input').should('have.value', 'New Name');
  });
});
