/**
 * The tests from this file were moved to the corresponding Playwright file apps/web/tests/start-from-scratch-tour.spec.ts.
 * @deprecated
 */
describe.skip('Start from scratch tour hints', function () {
  beforeEach(function () {
    cy.initializeSession({ showOnBoardingTour: true }).as('session');
  });

  it('should show the start from scratch intro step', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });

    cy.getByTestId('scratch-workflow-tooltip').should('be.visible');
    cy.getByTestId('scratch-workflow-tooltip-title').should('have.text', 'Discover a quick guide');
    cy.getByTestId('scratch-workflow-tooltip-description').should(
      'have.text',
      'Four simple tips to become a workflow expert.'
    );
    cy.getByTestId('scratch-workflow-tooltip-skip-button').should('have.text', 'Watch later');

    cy.getByTestId('scratch-workflow-tooltip-primary-button').should('have.text', 'Show me');
  });

  it('should hide the start from scratch intro step after clicking on watch later', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });

    cy.getByTestId('scratch-workflow-tooltip').should('be.visible');
    cy.getByTestId('scratch-workflow-tooltip-title').should('have.text', 'Discover a quick guide');
    cy.getByTestId('scratch-workflow-tooltip-description').should(
      'have.text',
      'Four simple tips to become a workflow expert.'
    );

    cy.getByTestId('scratch-workflow-tooltip-primary-button').should('have.text', 'Show me');
    cy.getByTestId('scratch-workflow-tooltip-skip-button').should('have.text', 'Watch later').click();
    cy.getByTestId('scratch-workflow-tooltip').should('not.exist');
  });

  it('should show the start from scratch tour hints', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });

    cy.getByTestId('scratch-workflow-tooltip').should('be.visible');
    cy.getByTestId('scratch-workflow-tooltip-title').should('have.text', 'Discover a quick guide');
    cy.getByTestId('scratch-workflow-tooltip-description').should(
      'have.text',
      'Four simple tips to become a workflow expert.'
    );

    cy.getByTestId('scratch-workflow-tooltip-skip-button').should('have.text', 'Watch later');
    cy.getByTestId('scratch-workflow-tooltip-primary-button').should('have.text', 'Show me').click();

    cy.getByTestId('scratch-workflow-tooltip-title').should('have.text', 'Click to edit workflow name');
    cy.getByTestId('scratch-workflow-tooltip-description').should(
      'have.text',
      'Specify a name for your workflow here or in the workflow settings.'
    );

    cy.getByTestId('scratch-workflow-tooltip-primary-button').should('have.text', 'Next').click();

    cy.getByTestId('scratch-workflow-tooltip-title').should('have.text', 'Verify workflow settings');
    cy.getByTestId('scratch-workflow-tooltip-description').should(
      'have.text',
      'Manage name, identifier, group and description. Set up channels, active by default.'
    );

    cy.getByTestId('scratch-workflow-tooltip-primary-button').should('have.text', 'Next').click();

    cy.getByTestId('scratch-workflow-tooltip-title').should('have.text', 'Build a notification workflow');
    cy.getByTestId('scratch-workflow-tooltip-description').should(
      'have.text',
      'Add channels you would like to send notifications to. The channels will be inserted to the trigger snippet.'
    );

    cy.getByTestId('scratch-workflow-tooltip-primary-button').should('have.text', 'Next').click();

    cy.getByTestId('scratch-workflow-tooltip-title').should('have.text', 'Run a test or Get Snippet');
    cy.getByTestId('scratch-workflow-tooltip-description').should(
      'have.text',
      'Test a trigger as if it was sent from your API. Deploy it to your App by copy/paste trigger snippet.'
    );

    cy.getByTestId('scratch-workflow-tooltip-primary-button').should('have.text', 'Got it').click();

    cy.getByTestId('scratch-workflow-tooltip').should('not.exist');
  });

  it('should show the dots navigation after the intro step', () => {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });

    cy.getByTestId('scratch-workflow-tooltip').should('be.visible');
    cy.getByTestId('scratch-workflow-tooltip-title').should('have.text', 'Discover a quick guide');
    cy.getByTestId('scratch-workflow-tooltip-description').should(
      'have.text',
      'Four simple tips to become a workflow expert.'
    );
    cy.getByTestId('scratch-workflow-tooltip-skip-button').should('have.text', 'Watch later');

    cy.getByTestId('scratch-workflow-tooltip-primary-button').should('have.text', 'Show me').click();
    cy.getByTestId('scratch-workflow-tooltip-dots-navigation').should('be.visible');
  });

  it('should show not show the start from scratch tour hints after it is shown twice', () => {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });

    cy.getByTestId('scratch-workflow-tooltip').should('be.visible');
    cy.getByTestId('scratch-workflow-tooltip-title').should('have.text', 'Discover a quick guide');
    cy.getByTestId('scratch-workflow-tooltip-description').should(
      'have.text',
      'Four simple tips to become a workflow expert.'
    );

    cy.getByTestId('scratch-workflow-tooltip-primary-button').should('have.text', 'Show me');
    cy.getByTestId('scratch-workflow-tooltip-skip-button').should('have.text', 'Watch later').click();
    cy.getByTestId('scratch-workflow-tooltip').should('not.exist');

    cy.reload();

    cy.getByTestId('scratch-workflow-tooltip').should('be.visible');
    cy.getByTestId('scratch-workflow-tooltip-skip-button').should('have.text', 'Watch later').click();
    cy.getByTestId('scratch-workflow-tooltip').should('not.exist');

    cy.reload();
    cy.getByTestId('scratch-workflow-tooltip').should('not.exist');
  });
});
