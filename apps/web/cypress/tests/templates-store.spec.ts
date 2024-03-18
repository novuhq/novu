describe('Templates Store', function () {
  const getTemplateDetails = (templateName: string): { name: string; iconName: string } => {
    const regexResult = /^:.{1,}:/.exec(templateName);
    let name = '';
    let iconName = 'fa-solid fa-question';
    if (regexResult !== null) {
      name = templateName.replace(regexResult[0], '').trim();
      iconName = regexResult[0].replace(/:/g, '').trim();
    }

    return { name, iconName: iconName };
  };

  beforeEach(function () {
    cy.mockFeatureFlags({ IS_TEMPLATE_STORE_ENABLED: true });
    cy.initializeSession({ noTemplates: true }).as('session');
    indexedDB.deleteDatabase('localforage');
  });

  it('the all templates tile should be disabled when there are no blueprints ', function () {
    cy.intercept('**/notification-templates**').as('getTemplates');
    cy.intercept('**/blueprints/group-by-category').as('getBlueprints');
    cy.visit('/workflows');
    cy.wait('@getTemplates');

    cy.getByTestId('no-workflow-templates-placeholder').should('be.visible');
    cy.getByTestId('create-workflow-tile').should('exist');
    cy.getByTestId('all-workflow-tile').should('exist').should('be.disabled');
  });

  it('the all templates tile should be enabled and popular should be shown when blueprints are fetched', function () {
    cy.makeBlueprints();
    cy.intercept('**/notification-templates**').as('getTemplates');
    cy.intercept('**/blueprints/group-by-category').as('getBlueprints');
    cy.visit('/workflows');
    cy.wait('@getTemplates');

    cy.getByTestId('no-workflow-templates-placeholder').should('be.visible');
    cy.getByTestId('create-workflow-tile').should('exist');
    cy.getByTestId('all-workflow-tile').should('exist').should('be.disabled');

    cy.wait('@getBlueprints');
    cy.getByTestId('all-workflow-tile').should('exist').should('not.be.disabled');
    cy.getByTestId('popular-workflow-tile').should('have.length', 2);
    cy.getByTestId('popular-workflow-tile').should('be.visible', 2);
  });

  it('should show the popover when hovering over the popular tile', function () {
    cy.makeBlueprints();
    cy.intercept('**/notification-templates**').as('getTemplates');
    cy.intercept('**/blueprints/group-by-category').as('getBlueprints');
    cy.visit('/workflows');
    cy.wait('@getTemplates');
    cy.wait('@getBlueprints');

    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/v1/blueprints/group-by-category`,
    }).then(({ body }) => {
      const { blueprints: popularBlueprints } = body.data.popular;
      const firstPopular = popularBlueprints[0];
      const { name } = getTemplateDetails(firstPopular.name);

      cy.getByTestId('no-workflow-templates-placeholder').should('be.visible');
      cy.getByTestId('popular-workflow-tile').should('have.length', 2);
      cy.getByTestId('popular-workflow-tile').should('be.visible', 2);
      cy.getByTestId('popular-workflow-tile').contains(name).trigger('mouseover');
      cy.get('.mantine-Popover-dropdown').should('be.visible').contains(firstPopular.description);
    });
  });

  it('should show the popular dropdown items', function () {
    cy.makeBlueprints();
    cy.intercept('**/notification-templates**').as('getTemplates');
    cy.intercept('**/blueprints/group-by-category').as('getBlueprints');
    cy.visit('/workflows');
    cy.wait('@getTemplates');
    cy.wait('@getBlueprints');

    cy.getByTestId('create-workflow-dropdown').should('be.visible').click();
    cy.getByTestId('create-workflow-btn').should('be.visible');
    cy.getByTestId('create-workflow-all-templates').should('be.visible');

    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/v1/blueprints/group-by-category`,
    }).then(({ body }) => {
      const { blueprints: popularBlueprints } = body.data.popular;
      const firstPopular = popularBlueprints[0];
      const secondPopular = popularBlueprints[1];
      const { name: firstName } = getTemplateDetails(firstPopular.name);
      const { name: secondName } = getTemplateDetails(secondPopular.name);

      cy.getByTestId('create-template-dropdown-item').should('have.length', 2);
      cy.getByTestId('create-template-dropdown-item').contains(firstName);
      cy.getByTestId('create-template-dropdown-item').contains(secondName);
    });
  });

  it('should create template from the popular dropdown items', function () {
    cy.makeBlueprints();
    cy.intercept('**/notification-templates**').as('getTemplates');
    cy.intercept('**/blueprints/group-by-category').as('getBlueprints');
    cy.intercept('POST', '**/notification-templates**').as('createTemplate');
    cy.visit('/workflows');
    cy.wait('@getTemplates');
    cy.wait('@getBlueprints');

    cy.getByTestId('create-workflow-dropdown').should('be.visible').click();
    cy.getByTestId('create-workflow-btn').should('be.visible');
    cy.getByTestId('create-workflow-all-templates').should('be.visible');

    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/v1/blueprints/group-by-category`,
    }).then(({ body }) => {
      const { blueprints: popularBlueprints } = body.data.popular;
      const firstPopular = popularBlueprints[0];
      const { name: firstName } = getTemplateDetails(firstPopular.name);

      cy.getByTestId('create-template-dropdown-item').contains(firstName).click();

      cy.wait('@createTemplate');

      cy.location('pathname').should('contain', `/workflows/edit`);
    });
  });

  it('should show the popular description in the popover when hovering over the dropdown item', function () {
    cy.makeBlueprints();
    cy.intercept('**/notification-templates**').as('getTemplates');
    cy.intercept('**/blueprints/group-by-category').as('getBlueprints');
    cy.visit('/workflows');
    cy.wait('@getTemplates');
    cy.wait('@getBlueprints');

    cy.getByTestId('create-workflow-dropdown').should('be.visible').click();
    cy.getByTestId('create-workflow-btn').should('be.visible');
    cy.getByTestId('create-workflow-all-templates').should('be.visible');

    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/v1/blueprints/group-by-category`,
    }).then(({ body }) => {
      const { blueprints: popularBlueprints } = body.data.popular;
      const firstPopular = popularBlueprints[0];
      const { name: firstName } = getTemplateDetails(firstPopular.name);

      cy.getByTestId('create-template-dropdown-item').should('have.length', 2);
      cy.getByTestId('create-template-dropdown-item').contains(firstName).trigger('mouseover');
      cy.get('.mantine-Popover-dropdown').should('be.visible').contains(firstPopular.description);
    });
  });

  it('should create template from the popular tile items', function () {
    cy.makeBlueprints().as('blueprints');
    cy.intercept('**/notification-templates**').as('getTemplates');
    cy.intercept('**/blueprints/group-by-category').as('getBlueprints');
    cy.intercept('POST', '**/notification-templates**').as('createTemplate');
    cy.visit('/workflows');
    cy.wait('@getTemplates');
    cy.wait('@getBlueprints');

    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/v1/blueprints/group-by-category`,
    }).then(({ body }) => {
      const { blueprints: popularBlueprints } = body.data.popular;
      const firstPopular = popularBlueprints[0];
      const { name: firstName } = getTemplateDetails(firstPopular.name);

      cy.getByTestId('no-workflow-templates-placeholder').contains(firstName).click();

      cy.wait('@createTemplate');

      cy.location('pathname').should('contain', `/workflows/edit`);
    });
  });

  it('should show the templates store modal when clicking on the all templates tile', function () {
    cy.makeBlueprints().as('blueprints');
    cy.intercept('**/notification-templates**').as('getTemplates');
    cy.intercept('**/blueprints/group-by-category').as('getBlueprints');
    cy.visit('/workflows');
    cy.wait('@getTemplates');
    cy.wait('@getBlueprints');

    cy.getByTestId('all-workflow-tile').should('exist').should('not.be.disabled').click();
    cy.getByTestId('templates-store-modal').should('be.visible');
    cy.get('.react-flow').should('be.visible');
    cy.get('.react-flow__container').should('be.visible');
    cy.get('.react-flow__controls').should('be.visible');
    cy.getByTestId('templates-store-modal-use-template').should('be.enabled').contains('Use template');

    cy.get('@blueprints').then((blueprints) => {
      blueprints.forEach((blueprint) => {
        const { name } = getTemplateDetails(blueprint.name);
        cy.getByTestId('templates-store-modal-sidebar').contains(name);
      });
    });
  });

  it('should show the templates store modal and allow selecting blueprints', function () {
    cy.makeBlueprints().as('blueprints');
    cy.intercept('**/notification-templates**').as('getTemplates');
    cy.intercept('**/blueprints/group-by-category').as('getBlueprints');
    cy.visit('/workflows');
    cy.wait('@getTemplates');
    cy.wait('@getBlueprints');

    cy.getByTestId('all-workflow-tile').should('exist').should('not.be.disabled').click();
    cy.getByTestId('templates-store-modal').should('be.visible');

    cy.get('@blueprints').then((blueprints) => {
      const { name: firstBlueprintName } = getTemplateDetails(blueprints[0].name);
      cy.getByTestId('templates-store-modal-blueprint-name').contains(firstBlueprintName);
      cy.getByTestId('templates-store-modal-blueprint-description').contains(blueprints[0].description);

      const { name: secondBlueprintName } = getTemplateDetails(blueprints[1].name);
      cy.getByTestId('templates-store-modal-blueprint-item').contains(secondBlueprintName).click();
      cy.getByTestId('templates-store-modal-blueprint-name').contains(secondBlueprintName);
      cy.getByTestId('templates-store-modal-blueprint-description').contains(blueprints[1].description);
    });
  });

  it('should allow creating workflow from the blueprint and redirect to the editor', function () {
    cy.makeBlueprints().as('blueprints');
    cy.intercept('GET', '**/notification-templates**').as('getTemplates');
    cy.intercept('POST', '**/notification-templates**').as('createTemplate');
    cy.intercept('**/blueprints/group-by-category').as('getBlueprints');
    cy.visit('/workflows');
    cy.wait('@getTemplates');
    cy.wait('@getBlueprints');

    cy.getByTestId('all-workflow-tile').should('exist').should('not.be.disabled').click();
    cy.getByTestId('templates-store-modal').should('be.visible');
    cy.getByTestId('templates-store-modal-use-template').should('be.enabled').click();

    cy.wait('@createTemplate');

    cy.location('pathname').should('contain', `/workflows/edit`);
  });
});
