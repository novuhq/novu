describe('Translations Group Page', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should display translations group page', function () {
    cy.visit('/translations');

    cy.getByTestId('translation-title').should('have.text', 'Translations');
  });

  it('should add a new translations group', function () {
    createTranslationGroup();
    cy.getByTestId('test-group').click({ force: true });
    cy.getByTestId('translation-filename').should('have.text', 'Empty...');
    cy.getByTestId('translation-keys-value').should('have.text', '');
  });

  it('should delete a translations group', function () {
    createTranslationGroup();
    cy.getByTestId('delete-group-btn').click();
    cy.getByTestId('delete-group-submit-btn').should('have.text', 'Delete group').click();
    cy.getByTestId('add-group-btn').should('exist');
  });

  it('should upload translation file', function () {
    createTranslationGroup();

    cy.getByTestId('upload-files-container').find('input').attachFile('translation.json');
    cy.getByTestId('upload-submit-btn').click();
    cy.visit('/translations');
    cy.getByTestId('test-group').click();
    cy.getByTestId('translation-filename').should('have.text', 'translation.json');
    cy.getByTestId('translation-keys-value').should('have.text', 15);
  });
});

function createTranslationGroup() {
  const identifier = 'test-group';

  cy.visit('/translations');
  cy.waitForNetworkIdle(500);
  cy.getByTestId('translation-title').should('have.text', 'Translations');
  cy.getByTestId('add-group-btn').click();
  cy.waitForNetworkIdle(500);

  cy.getByTestId('default-language-select').click().type('Hindi');

  cy.get('.mantine-Select-item').first().click();
  cy.getByTestId('default-language-submit-btn').click();
  cy.waitForNetworkIdle(500);

  cy.getByTestId('group-name-input').type('Test Group');
  cy.getByTestId('group-identifier-input').should('have.value', identifier);
  cy.getByTestId('add-group-submit-btn').click({ force: true });
  cy.waitForNetworkIdle(1000);
}
