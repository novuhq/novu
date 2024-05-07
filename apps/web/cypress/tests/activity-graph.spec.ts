/**
 * The tests from this file were moved to the corresponding Playwright file apps/web/tests/activity-graph.spec.ts.
 * @deprecated
 */
describe.skip('Activity page', function () {
  beforeEach(function () {
    // @ts-expect-error
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

  it('should display email available for connection', function () {
    cy.visit('/activities');
    cy.location('pathname').should('equal', '/activities');

    // @ts-expect-error
    cy.getByTestId('activity-stats-weekly-sent').contains('25');
  });
});
