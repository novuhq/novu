describe('Translations Group Page', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should display translations group page', function () {
    cy.visit('/translations');

    cy.getByTestId('translation-title').should('have.text', 'Translations');
  });

  it('should add a new translations group', function () {
    cy.visit('/translations');
    cy.waitForNetworkIdle(500);
    cy.getByTestId('translation-title').should('have.text', 'Translations');
    cy.getByTestId('add-group-btn').click();
    cy.getByTestId('default-language-select').click();
    cy.get('.mantine-Select-item').first().click();
    cy.getByTestId('default-language-submit-btn').click();
    cy.getByTestId('group-name-input').type('Test Group');
    cy.getByTestId('group-identifier-input').should('have.value', 'test-group');
    cy.getByTestId('add-group-submit-btn').click();
  });

  it('should delete a translations group', function () {
    cy.visit('/translations');
    cy.waitForNetworkIdle(500);
    cy.getByTestId('translation-title').should('have.text', 'Translations');
    cy.getByTestId('add-group-btn').click();
    cy.getByTestId('default-language-select').click();
    cy.get('.mantine-Select-item').first().click();
    cy.getByTestId('default-language-submit-btn').click();
    cy.getByTestId('group-name-input').type('Test Group');
    cy.getByTestId('group-identifier-input').should('have.value', 'test-group');
    cy.getByTestId('add-group-submit-btn').click();
    cy.getByTestId('delete-group-btn').click();
    cy.getByTestId('delete-group-submit-btn').should('have.text', 'Delete group').click();
    cy.getByTestId('add-group-btn').should('exist');
  });
});
