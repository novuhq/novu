describe('Activity Feed Screen', function () {
  beforeEach(function () {
    cy.initializeSession()
      .as('session')
      .then((session: any) => {
        cy.wait(500);

        return cy.task('createNotifications', {
          identifier: session.templates[0].triggers[0].identifier,
          token: session.token,
          count: 25,
          organizationId: session.organization._id,
          applicationId: session.application._id,
        });
      });
  });

  it('should display notification templates list', function () {
    cy.visit('/activities');
    cy.getByTestId('activities-table')
      .find('tbody tr')
      .first()
      .getByTestId('row-template-name')
      .contains(this.session.templates[0].name);

    cy.getByTestId('activities-table').find('tbody tr').first().getByTestId('row-in-app-channel').should('be.visible');
    cy.getByTestId('activities-table').find('tbody tr').first().getByTestId('row-email-channel').should('be.visible');
  });

  it('should display stats on top of page', function () {
    cy.visit('/activities');
    cy.get('.ant-statistic')
      .contains('Sent this month', {
        matchCase: false,
      })
      .parent('.ant-statistic')
      .contains('50');
    cy.get('.ant-statistic')
      .contains('Sent this week', {
        matchCase: false,
      })
      .parent('.ant-statistic')
      .contains('50');
  });

  it('should show errors and warning', function () {
    cy.intercept(/.*activity\?page.*/, (r) => {
      r.continue((res) => {
        res.body.data[0].status = 'error';
        res.body.data[0].errorText = 'Test Error Text';
        res.body.data[2].status = 'warning';

        res.send({ body: res.body });
      });
    });
    cy.visit('/activities');
    cy.get('tbody tr').eq(0).get('.ant-badge-status-error').should('be.visible');
    cy.get('tbody tr').eq(1).get('.ant-badge-status-success').should('be.visible');
    cy.get('tbody tr').eq(2).get('.ant-badge-status-warning').should('be.visible');
  });

  it('should filter by email channel', function () {
    cy.visit('/activities');
    cy.getByTestId('row-email-channel').should('not.have.length', 10);
    cy.getByTestId('activities-filter').click();
    cy.get('.ant-select-item').contains('Email').click();
    cy.getByTestId('row-email-channel').should('have.length', 10);
  });
});
