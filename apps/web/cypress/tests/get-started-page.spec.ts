describe('GetStartedPage', () => {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  const visitTabAndVerifyContent = (tabTitle, expectedContent) => {
    cy.contains(tabTitle).click();
    cy.contains(expectedContent).should('exist');
  };

  afterEach(() => {
    // Add any teardown code if needed
  });

  it('should have all tabs and default to in-app', () => {
    cy.visit('/get-started'); // Update with the actual path

    // check all tabs exist
    cy.contains('div', 'In-app').should('exist');
    // cy.contains('div', 'In-app').should('exist').should('have.attr', 'aria-selected').and('match', 'true');
    cy.contains('div', 'Multi-channel').should('exist');
    cy.contains('div', 'Digest').should('exist');
    cy.contains('div', 'Delay').should('exist');
    cy.contains('div', 'Translate').should('exist');
  });
});
