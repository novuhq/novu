/**
 * The tests from this file were moved to the corresponding Playwright file apps/web/tests/digest-playground.spec.ts.
 * @deprecated
 */
describe.skip('Digest Playground Workflow Page', function () {
  beforeEach(function () {
    cy.initializeSession({ noTemplates: true }).as('session');
  });

  it('should have a link to the docs', function () {
    cy.intercept('GET', '**/notification-templates**').as('notificationTemplates');
    cy.visit('/get-started');

    cy.getByTestId('get-started-footer-left-side').click();
    cy.wait('@notificationTemplates');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('try-digest-playground-btn').click();

    cy.url().should('include', '/digest-playground');
    cy.contains('Digest Workflow Playground');

    cy.get('a[href^="https://docs.novu.co/workflows/digest"]').contains('Learn more in docs');
  });

  it('the set up digest workflow should redirect to template edit page', function () {
    cy.intercept('GET', '**/notification-templates**').as('notificationTemplates');
    cy.intercept('GET', '**/notification-templates/**').as('getNotificationTemplate');
    cy.visit('/get-started');

    cy.getByTestId('get-started-footer-left-side').click();
    cy.wait('@notificationTemplates');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('try-digest-playground-btn').click();

    cy.url().should('include', '/digest-playground');
    cy.contains('Digest Workflow Playground');

    cy.get('button').contains('Set Up Digest Workflow').click();
    cy.wait('@getNotificationTemplate');

    cy.url().should('include', '/workflows/edit');
  });

  it('should show the digest workflow hints', () => {
    cy.intercept('GET', '**/notification-templates**').as('notificationTemplates');
    cy.intercept('GET', '**/notification-templates/**').as('getNotificationTemplate');
    cy.visit('/get-started');

    // click try digest playground
    cy.getByTestId('get-started-footer-left-side').click();
    cy.wait('@notificationTemplates');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('try-digest-playground-btn').click();

    cy.url().should('include', '/digest-playground');
    cy.contains('Digest Workflow Playground');

    // click set up digest workflow
    cy.get('button').contains('Set Up Digest Workflow').click();
    cy.wait('@getNotificationTemplate');

    // in the template workflow editor
    cy.url().should('include', '/workflows/edit');

    // check the digest hint
    cy.getByTestId('digest-workflow-tooltip').contains('Set-up time interval');
    cy.getByTestId('digest-workflow-tooltip').contains(
      'Specify for how long the digest should collect events before sending a digested event to the next step step in the workflow.'
    );
    cy.getByTestId('digest-workflow-tooltip-primary-button').contains('Next');
    cy.getByTestId('digest-workflow-tooltip-skip-button').contains('Skip tour');
    cy.getByTestId('digest-workflow-tooltip-dots-navigation').should('be.visible');

    // check if has digest step
    cy.getByTestId('node-digestSelector').should('be.visible');
    // check if digest step settings opened
    cy.getByTestId('step-editor-sidebar').should('exist');
    cy.getByTestId('step-editor-sidebar').contains('All events');

    // click next on hint
    cy.getByTestId('digest-workflow-tooltip-primary-button').contains('Next').click();
    cy.waitForNetworkIdle(1000);

    // check the email hint
    cy.getByTestId('digest-workflow-tooltip').contains('Set-up email content');
    cy.getByTestId('digest-workflow-tooltip').contains(
      'Use custom HTML or our visual editor to define how the email will look like when sent to the subscriber.'
    );
    cy.getByTestId('digest-workflow-tooltip-primary-button').contains('Next');
    cy.getByTestId('digest-workflow-tooltip-skip-button').contains('Skip tour');
    cy.getByTestId('digest-workflow-tooltip-dots-navigation').should('be.visible');

    // check if email step settings opened
    cy.getByTestId('step-editor-sidebar').should('exist');
    cy.getByTestId('step-editor-sidebar').contains('Email');

    // click next on hint
    cy.getByTestId('digest-workflow-tooltip-primary-button').contains('Next').click();

    // check the email hint
    cy.getByTestId('digest-workflow-tooltip').contains('Test your workflow');
    cy.getByTestId('digest-workflow-tooltip').contains(
      'We will trigger the workflow multiple times to represent how it aggregates notifications.'
    );
    cy.getByTestId('digest-workflow-tooltip-primary-button').contains('Got it');
    cy.getByTestId('digest-workflow-tooltip-skip-button').should('not.exist');
    cy.getByTestId('digest-workflow-tooltip-dots-navigation').should('be.visible');

    // the step settings should be hidden
    cy.getByTestId('workflow-sidebar').should('exist');
    cy.getByTestId('workflow-sidebar').contains('Trigger');

    // click got it should hide the hint
    cy.getByTestId('digest-workflow-tooltip-primary-button').contains('Got it').click();

    cy.getByTestId('digest-workflow-tooltip').should('not.exist');
  });

  it('should hide the digest workflow hints when clicking on skip tour button', () => {
    cy.intercept('GET', '**/notification-templates**').as('notificationTemplates');
    cy.intercept('GET', '**/notification-templates/**').as('getNotificationTemplate');
    cy.visit('/get-started');

    // click try digest playground
    cy.getByTestId('get-started-footer-left-side').click();
    cy.wait('@notificationTemplates');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('try-digest-playground-btn').click();

    cy.url().should('include', '/digest-playground');
    cy.contains('Digest Workflow Playground');

    // click set up digest workflow
    cy.get('button').contains('Set Up Digest Workflow').click();
    cy.wait('@getNotificationTemplate');

    // in the template workflow editor
    cy.url().should('include', '/workflows/edit');

    // check the digest hint
    cy.getByTestId('digest-workflow-tooltip').contains('Set-up time interval');
    cy.getByTestId('digest-workflow-tooltip-skip-button').contains('Skip tour').click();

    cy.getByTestId('digest-workflow-tooltip').should('not.exist');
  });

  it('when clicking on the back button from the playground it should redirect to /get-started/preview', function () {
    cy.intercept('GET', '**/notification-templates**').as('notificationTemplates');
    cy.intercept('GET', '**/notification-templates/**').as('getNotificationTemplate');
    cy.visit('/get-started');

    // click try digest playground
    cy.getByTestId('get-started-footer-left-side').click();
    cy.wait('@notificationTemplates');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('try-digest-playground-btn').click();

    cy.url().should('include', '/digest-playground');
    cy.contains('Digest Workflow Playground');

    cy.contains('Go Back').click();

    cy.url().should('include', '/get-started/preview');
  });
});
