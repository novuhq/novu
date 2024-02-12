describe('User Preferences - Custom Filtering', function () {
  const preferenceFilter = (userPreference) => !!userPreference?.template?.data?.shouldDisplay;

  it('should filter by preferenceFilter', function () {
    // widget initialization with custom filter
    cy.intercept('**/preferences', (r) => {
      r.continue((res) => {
        if (!res.body?.data) return;

        res.body.data[0].template.critical = false;
        res.body.data[0].template.data = { shouldDisplay: true };

        res.send({ body: res.body });
      });
    });

    cy.initializeSession({ preferenceFilter: preferenceFilter }) // filter is set here
      .as('session')
      .then((session: any) => {
        cy.wait(500);

        cy.task('createNotifications', {
          identifier: session?.templates[0]?.triggers[0]?.identifier,
          token: session?.token,
          subscriberId: session?.subscriber?.subscriberId,
          count: 1,
          organizationId: session?.organization?._id,
          templateId: session?.templates[0]?._id,
        });

        cy.wait(1000);
      });
    // end

    cy.getByTestId('user-preference-cog').click();
    cy.getByTestId('workflow-list-item').should('have.length', 1);
  });

  it('should not filter if filter function is missing', function () {
    // widget initialization without custom filter
    cy.intercept('**/preferences', (r) => {
      r.continue((res) => {
        if (!res.body?.data) return;

        res.body.data[0].template.critical = false;
        res.body.data[0].template.data = { shouldDisplay: true };

        res.send({ body: res.body });
      });
    });

    cy.initializeSession()
      .as('session')
      .then((session: any) => {
        cy.wait(500);

        cy.task('createNotifications', {
          identifier: session?.templates[0]?.triggers[0]?.identifier,
          token: session?.token,
          subscriberId: session?.subscriber?.subscriberId,
          count: 1,
          organizationId: session?.organization?._id,
          templateId: session?.templates[0]?._id,
        });

        cy.wait(1000);
      });
    // end

    cy.getByTestId('user-preference-cog').click();
    cy.getByTestId('workflow-list-item').should('have.length', 5);
  });
});
