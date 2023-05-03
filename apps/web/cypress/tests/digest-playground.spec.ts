describe('Digest Playground Workflow Page', function () {
  beforeEach(function () {
    cy.initializeSession({ noTemplates: true }).as('session');
  });

  it('should have a link to the docs', function () {
    cy.intercept('**/notification-templates**').as('notificationTemplates');
    cy.visit('/templates');
    cy.wait('@notificationTemplates');

    cy.getByTestId('no-workflow-templates-placeholder').should('be.visible');
    cy.getByTestId('try-digest-playground-tile').click();

    cy.url().should('include', '/digest-playground');
    cy.contains('Digest Workflow Playground');

    cy.get('a[href="https://docs.novu.co/platform/digest"]').contains('Learn more in docs');
  });

  it('the set up digest workflow should redirec to template edit page', function () {
    cy.intercept('**/notification-templates**').as('notificationTemplates');
    cy.visit('/templates');
    cy.wait('@notificationTemplates');

    cy.getByTestId('no-workflow-templates-placeholder').should('be.visible');
    cy.getByTestId('try-digest-playground-tile').click();

    cy.url().should('include', '/digest-playground');
    cy.contains('Digest Workflow Playground');

    cy.get('button').contains('Set Up Digest Workflow').click();

    cy.url().should('include', '/templates/edit');
  });

  it('should show the digest workflow hints', () => {
    cy.intercept('**/notification-templates**').as('notificationTemplates');
    cy.visit('/templates');
    cy.wait('@notificationTemplates');

    // click try digest playground
    cy.getByTestId('no-workflow-templates-placeholder').should('be.visible');
    cy.getByTestId('try-digest-playground-tile').click();

    cy.url().should('include', '/digest-playground');
    cy.contains('Digest Workflow Playground');

    // click set up digest workflow
    cy.get('button').contains('Set Up Digest Workflow').click();

    // in the template workflow editor
    cy.url().should('include', '/templates/edit');

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
    cy.getByTestId('step-page-wrapper').should('be.visible');
    cy.getByTestId('step-page-wrapper').contains('Digest');

    // click next on hint
    cy.getByTestId('digest-workflow-tooltip-primary-button').contains('Next').click();

    // check the email hint
    cy.getByTestId('digest-workflow-tooltip').contains('Set-up email content');
    cy.getByTestId('digest-workflow-tooltip').contains(
      'Use custom HTML or our visual editor to define how the email will look like when sent to the subscriber.'
    );
    cy.getByTestId('digest-workflow-tooltip-primary-button').contains('Next');
    cy.getByTestId('digest-workflow-tooltip-skip-button').contains('Skip tour');
    cy.getByTestId('digest-workflow-tooltip-dots-navigation').should('be.visible');

    // check if email step settings opened
    cy.getByTestId('step-page-wrapper').should('be.visible');
    cy.getByTestId('step-page-wrapper').contains('Email');

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
    cy.getByTestId('step-page-wrapper').should('be.visible');
    cy.getByTestId('step-page-wrapper').contains('Trigger');

    // click got it should hide the hint
    cy.getByTestId('digest-workflow-tooltip-primary-button').contains('Got it').click();

    cy.getByTestId('digest-workflow-tooltip').should('not.exist');
  });

  it('should hide the digest workflow hints when clicking on skip tour button', () => {
    cy.intercept('**/notification-templates**').as('notificationTemplates');
    cy.visit('/templates');
    cy.wait('@notificationTemplates');

    // click try digest playground
    cy.getByTestId('no-workflow-templates-placeholder').should('be.visible');
    cy.getByTestId('try-digest-playground-tile').click();

    cy.url().should('include', '/digest-playground');
    cy.contains('Digest Workflow Playground');

    // click set up digest workflow
    cy.get('button').contains('Set Up Digest Workflow').click();

    // in the template workflow editor
    cy.url().should('include', '/templates/edit');

    // check the digest hint
    cy.getByTestId('digest-workflow-tooltip').contains('Set-up time interval');
    cy.getByTestId('digest-workflow-tooltip-skip-button').contains('Skip tour').click();

    cy.getByTestId('digest-workflow-tooltip').should('not.exist');
  });
});
