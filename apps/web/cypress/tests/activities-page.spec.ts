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
          environmentId: session.environment._id,
        });
      });
  });

  it('should display notification templates list', function () {
    cy.intercept('*/activity*', (r) => {
      r.continue((res) => {
        res.body.data[0].subscriber.firstName = 'lowercase';

        res.send({ body: res.body });
      });
    });

    cy.visit('/activities');
    cy.getByTestId('activities-table')
      .find('tbody tr')
      .first()
      .getByTestId('row-template-name')
      .contains(this.session.templates[0].name);

    cy.getByTestId('activities-table').find('tbody tr').first().getByTestId('row-in-app-channel').should('be.visible');
    cy.getByTestId('activities-table').find('tbody tr').first().getByTestId('row-email-channel').should('be.visible');
    cy.getByTestId('activities-table').find('tbody tr').first().getByTestId('subscriber-name').contains('Lowercase');
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

    cy.get('tbody tr')
      .getByTestId('status-badge')
      .eq(0)
      .should('have.css', 'background-color')
      .and('eq', 'rgb(229, 69, 69)');

    cy.get('tbody tr')
      .getByTestId('status-badge')
      .eq(1)
      .should('have.css', 'background-color')
      .and('eq', 'rgb(77, 153, 128)');

    cy.get('tbody tr')
      .getByTestId('status-badge')
      .eq(2)
      .should('have.css', 'background-color')
      .and('eq', 'rgb(229, 69, 69)');
  });

  it('should filter by email channel', function () {
    cy.visit('/activities');
    cy.getByTestId('row-email-channel').should('not.have.length', 10);
    cy.getByTestId('activities-filter').click();
    cy.get('.mantine-MultiSelect-item').contains('Email').click();
    cy.getByTestId('row-email-channel').should('have.length', 10);
  });
});
