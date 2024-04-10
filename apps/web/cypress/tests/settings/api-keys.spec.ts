describe('API Keys Page', () => {
  const testClipboardInput = (inputTestId: string) => {
    cy.getByTestId(`${inputTestId}-copy`).focus().click();
    cy.getClipboardValue().then((clipVal) => {
      cy.getByTestId(`${inputTestId}`)
        .focus()
        .invoke('val')
        .then((inputVal) => {
          expect(inputVal).to.equal(clipVal);
        });
    });
  };

  beforeEach(() => {
    cy.mockFeatureFlags({ IS_INFORMATION_ARCHITECTURE_ENABLED: true });
    cy.initializeSession().as('session');

    cy.intercept('GET', '/v1/environments/api-keys').as('getApiKeys');

    cy.waitLoadEnv(() => {
      cy.visit('/settings/api-keys/Development');
    });
    cy.wait('@getApiKeys');
  });

  it('should render the API key container', () => {
    cy.getByTestId('api-key').should('exist');
  });

  it('should show and hide the API key', () => {
    cy.getByTestId('api-key').should('have.attr', 'type', 'password');
    cy.get('#api-key-toggle-visibility-btn').click();
    cy.getByTestId('api-key').should('have.attr', 'type', 'text');
    cy.get('#api-key-toggle-visibility-btn').click();
    cy.getByTestId('api-key').should('have.attr', 'type', 'password');
  });

  it('should copy the API key', () => {
    testClipboardInput('api-key');
  });

  it('should render the Application Identifier container', () => {
    cy.getByTestId('application-identifier').should('exist');
  });

  it('should copy the Application Identifier', () => {
    testClipboardInput('application-identifier');
  });

  it('should render the Environment ID container', () => {
    cy.getByTestId('environment-id').should('exist');
  });

  it('should copy the Environment ID', () => {
    testClipboardInput('environment-id');
  });

  it('should open the Regeneration Modal', () => {
    cy.get('#api-key-regenerate-btn').click();
    cy.getByTestId('regenerate-api-key-modal').should('exist');
    cy.getByTestId('regenerate-api-key-modal-button').should('exist');
  });
});
