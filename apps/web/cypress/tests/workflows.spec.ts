import { TriggerTypeEnum } from '@novu/shared';

describe('Workflows Page', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should allow searching by name or identifier', function () {
    cy.createWorkflows({
      userId: this.session.user._id,
      organizationId: this.session.organization._id,
      environmentId: this.session.environment._id,
      workflows: [
        { name: 'SMS Workflow' },
        { triggers: [{ identifier: 'sms-test', variables: [], type: TriggerTypeEnum.EVENT }] },
      ],
    });

    cy.intercept('GET', '**/v1/notification-groups').as('notification-groups');
    cy.intercept('GET', '**/v1/notification-templates*').as('notification-templates');

    cy.visit('/workflows');
    cy.wait(['@notification-groups', '@notification-templates']);

    cy.getByTestId('workflows-search-input').type('SMS');
    cy.wait('@notification-templates');

    cy.getByTestId('workflow-row-name').should('have.length', 2);
    cy.getByTestId('workflow-row-name').contains('SMS Workflow');
    cy.getByTestId('workflow-row-trigger-identifier').contains('sms-test');
  });

  it('should allow clearing the search', function () {
    cy.intercept('GET', '**/v1/notification-groups').as('notification-groups');
    cy.intercept('GET', '**/v1/notification-templates*').as('notification-templates');

    cy.visit('/workflows');
    cy.wait(['@notification-groups', '@notification-templates']);

    cy.getByTestId('workflows-search-input').type('This template does not exist');
    cy.wait('@notification-templates');
    cy.getByTestId('workflows-no-matches').should('exist');

    cy.getByTestId('search-input-clear').click();
    cy.getByTestId('workflows-no-matches').should('not.exist');
  });

  it('should show no results view', function () {
    cy.intercept('GET', '**/v1/notification-groups').as('notification-groups');
    cy.intercept('GET', '**/v1/notification-templates*').as('notification-templates');

    cy.visit('/workflows');
    cy.wait(['@notification-groups', '@notification-templates']);

    cy.getByTestId('workflows-search-input').type('This template does not exist');
    cy.wait('@notification-templates');

    cy.getByTestId('workflow-row-name').should('have.length', 0);
    cy.getByTestId('workflows-no-matches').should('exist');
  });
});
