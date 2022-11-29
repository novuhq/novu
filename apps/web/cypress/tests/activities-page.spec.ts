import { JobStatusEnum } from '@novu/shared';

describe('Activity Feed Screen', function () {
  beforeEach(function () {
    cy.initializeSession()
      .as('session')
      .then((session: any) => {
        return cy.task('createNotifications', {
          identifier: session.templates[0].triggers[0].identifier,
          token: session.token,
          count: 25,
          organizationId: session.organization._id,
          environmentId: session.environment._id,
        });
      });
  });

  it('should display notification for activity', function () {
    cy.visit('/activities');
    cy.getByTestId('activities-table')
      .find('button')
      .first()
      .getByTestId('row-template-name')
      .contains(this.session.templates[0].name);

    cy.getByTestId('activities-table').find('button').first().getByTestId('in_app-step').should('exist');
    cy.getByTestId('activities-table').find('button').first().getByTestId('email-step').should('exist');
    cy.getByTestId('activities-table').find('button').first().getByTestId('subscriber-id').should('exist');
  });

  it('should show errors and warning', function () {
    cy.intercept(/.*notifications\?page.*/, (r) => {
      r.continue((res) => {
        if (!res.body?.data) return;
        res.body.data[0].jobs[0].status = JobStatusEnum.FAILED;
        res.send({ body: res.body });
      });
    });
    cy.visit('/activities');

    cy.getByTestId('activities-table')
      .find('button')
      .first()
      .getByTestId('status-badge-item')
      .eq(0)
      .should('have.css', 'color')
      .and('eq', 'rgb(229, 69, 69)');
  });

  it('should filter by email channel', function () {
    cy.visit('/activities');
    cy.getByTestId('email-step').should('have.length', 10);
    cy.getByTestId('activities-filter').click();
    cy.get('.mantine-MultiSelect-item').contains('SMS').click();
    cy.getByTestId('email-step').should('have.length', 0);
  });
});
