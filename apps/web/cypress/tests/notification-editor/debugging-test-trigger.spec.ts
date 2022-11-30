import { addAndEditChannel, clickWorkflow, fillBasicNotificationDetails, goBack } from '.';

describe('Debugging - test trigger', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should open test trigger modal', function () {
    const template = this.session.templates[0];
    const userId = this.session.user.id;

    cy.intercept('GET', 'http://localhost:1336/v1/notification-templates/*').as('notification-templates');

    cy.waitLoadTemplatePage(() => {
      cy.visit('/templates/edit/' + template._id);
    });

    cy.wait('@notification-templates');

    cy.getByTestId('test-workflow-btn').click();
    cy.getByTestId('test-trigger-modal').should('be.visible');
    cy.getByTestId('test-trigger-modal').getByTestId('test-trigger-to-param').contains(`"subscriberId": "${userId}"`);
  });

  it('should create template before opening test trigger modal', function () {
    cy.intercept('POST', '*/notification-templates').as('createTemplate');
    const { id: userId, email: userEmail } = this.session.user;

    cy.waitLoadTemplatePage(() => {
      cy.visit('/templates/create');
    });

    fillBasicNotificationDetails('Test workflow');

    cy.waitLoadEnv(() => {
      clickWorkflow();
    });

    addAndEditChannel('email');

    cy.getByTestId('emailSubject').type('Hello world {{newVar}}', {
      parseSpecialCharSequences: false,
    });

    goBack();

    cy.getByTestId('test-workflow-btn').click();
    cy.getByTestId('save-changes-modal').get('button').contains('Save').click();

    cy.wait('@createTemplate').then((res) => {
      const createdTemplateId = res.response?.body.data._id;
      cy.get('.mantine-Notification-root').contains('Template saved successfully');
      cy.getByTestId('test-trigger-modal').should('be.visible');
      cy.getByTestId('test-trigger-modal').getByTestId('test-trigger-to-param').contains(`"subscriberId": "${userId}"`);
      cy.getByTestId('test-trigger-modal')
        .getByTestId('test-trigger-to-param')
        .should('have.value', `{\n  "subscriberId": "${userId}",\n  "email": "${userEmail}"\n}`);

      cy.getByTestId('test-trigger-modal')
        .getByTestId('test-trigger-payload-param')
        .should('have.value', '{\n  "newVar": "REPLACE_WITH_DATA"\n}');
      cy.getByTestId('test-trigger-modal').getByTestId('test-trigger-btn').click();
      cy.location('pathname').should('equal', `/templates/edit/${createdTemplateId}`);
    });
  });

  it('should not test trigger on error ', function () {
    const template = this.session.templates[0];
    cy.waitLoadTemplatePage(() => {
      cy.visit('/templates/edit/' + template._id);
    });
    cy.getByTestId('test-workflow-btn').click();

    cy.getByTestId('test-trigger-modal').should('be.visible');
    cy.getByTestId('test-trigger-modal').getByTestId('test-trigger-to-param').type('{backspace}');
    cy.getByTestId('test-trigger-modal').getByTestId('test-trigger-btn').click();
    cy.getByTestId('test-trigger-modal').should('be.visible');
    cy.getByTestId('test-trigger-modal')
      .getByTestId('test-trigger-to-param')
      .should('have.class', 'mantine-JsonInput-invalid');
  });
});
