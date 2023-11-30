describe('User Preferences', function () {
  beforeEach(function () {
    cy.intercept('**/notifications/feed?page=0').as('getNotifications');
    cy.intercept('**/preferences', (r) => {
      r.continue((res) => {
        if (!res.body?.data) return;

        res.body.data[0].template.critical = false;
        res.body.data[0].preference.channels.push = false;
        res.body.data[1].template.critical = false;

        res.send({ body: res.body });
      });
    });
    cy.intercept('**/preferences/**', (r) => {
      r.continue((res) => {
        if (!res.body?.data) return;

        res.body.data.template.critical = false;

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
  });

  it('should navigate between notifications and user preference screens', function () {
    cy.getByTestId('user-preference-cog').should('exist');
    cy.getByTestId('user-preference-cog').click();

    cy.getByTestId('workflow-list-item').should('have.length', 5);

    cy.getByTestId('go-back-btn').click();
    cy.getByTestId('notification-list-item').should('have.length', 1);
  });

  it.skip('should not send in app after user disables in app channel', function () {
    cy.task('createNotifications', {
      identifier: this.session?.templates[0]?.triggers[0]?.identifier,
      token: this.session?.token,
      subscriberId: this.session?.subscriber?.subscriberId,
      count: 1,
    });

    cy.wait('@getNotifications');
    cy.getByTestId('notification-list-item').should('have.length', 1);

    cy.getByTestId('user-preference-cog').click();

    openWorkflowItemByIndex(0).within(() => {
      cy.getByTestId('channel-preference-item')
        .eq(1)
        .within(() => {
          cy.contains('In App');
          cy.getByTestId('channel-preference-item-toggle').should('be.checked');
          cy.getByTestId('channel-preference-item-toggle').click();
          cy.getByTestId('channel-preference-item-toggle').should('not.be.checked');
        });
    });

    cy.task('createNotifications', {
      identifier: this.session?.templates[0]?.triggers[0]?.identifier,
      token: this.session?.token,
      subscriberId: this.session?.subscriber?.subscriberId,
      count: 1,
    });

    cy.getByTestId('go-back-btn').click();
    cy.wait('@getNotifications');
    cy.getByTestId('notification-list-item').should('have.length', 1);
  });

  it('should update a channel on toggle click', function () {
    cy.getByTestId('user-preference-cog').click();

    openWorkflowItemByIndex(0).within(() => {
      cy.getByTestId('workflow-active-channels').should('not.contain', 'Push');
      cy.getByTestId('workflow-active-channels').should('contain', 'Email');
      cy.getByTestId('channel-preference-item').should('have.length', 3);
      cy.getByTestId('channel-preference-item-toggle').eq(0).should('be.checked');
      cy.getByTestId('channel-preference-item-toggle').eq(0).click({ force: true });
      cy.wait(1000);

      cy.getByTestId('channel-preference-item-toggle').eq(0).should('not.be.checked');
      cy.getByTestId('workflow-active-channels').should('not.contain', 'Email');
    });

    openWorkflowItemByIndex(1).within(() => {
      cy.getByTestId('channel-preference-item').should('have.length', 2);
      cy.getByTestId('channel-preference-item-toggle').should('be.checked');
    });
    cy.getByTestId('workflow-list-item').eq(0).click();
    cy.getByTestId('channel-preference-item-toggle').eq(0).should('not.be.checked');
  });

  it('should show loader on update and disable all toggles', async function () {
    let sendResponse;
    const trigger = new Promise((resolve) => {
      sendResponse = resolve;
    });

    cy.intercept('**/preferences/**', (request) => {
      return trigger.then(() => {
        request.reply();
      });
    });
    cy.wait('@getNotifications');

    cy.getByTestId('user-preference-cog').click();
    cy.wait(1000);
    openWorkflowItemByIndex(0)
      .within(() => {
        cy.getByTestId('channel-preference-item-toggle').first().click();
        cy.getByTestId('channel-preference-item-loader').should('be.visible');
        cy.getByTestId('channel-preference-item-toggle').eq(1).should('be.disabled');
      })
      .then(() => {
        sendResponse();
        cy.getByTestId('channel-preference-item-loader').should('not.exist');
        cy.getByTestId('channel-preference-item-toggle').eq(1).should('not.be.disabled');
      });
  });
});

function openWorkflowItemByIndex(index: number) {
  return cy.getByTestId('workflow-list-item').eq(index).click();
}
