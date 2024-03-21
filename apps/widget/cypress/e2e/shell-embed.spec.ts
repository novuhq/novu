import { ChannelTypeEnum } from '@novu/shared';
import { IInitializeSessionSettings } from '../global';

describe('Shell Embed', function () {
  beforeEach(function () {
    cy.initializeSession({ shell: true }).as('session');
    cy.wait(1000);
  });

  it('should navigate to page on notification click', function () {
    cy.task('createNotifications', {
      identifier: this.session.templates[0].triggers[0].identifier,
      token: this.session.token,
      subscriberId: this.session.subscriber.subscriberId,
      count: 5,
      organizationId: this.session.organization._id,
    });

    cy.get('#notification-bell').click();

    const handlerObject = {
      handler: () => {},
    };
    cy.spy(handlerObject, 'handler').as('spy');

    cy.window().then((w) => {
      w.novu.on('notification_click', handlerObject.handler);
    });

    cy.get('#novu-iframe-element')
      .its('0.contentDocument.body')
      .should('not.be.empty')
      .then((body) => {
        cy.wrap(body).find('[data-test-id="notification-list-item"]').first().click();
      });
    cy.get('@spy').should('be.called');

    cy.url().should('include', '/cypress/test-shell/example/test?test-param=true');
  });

  it('should open and close widget on body click', function () {
    cy.get('#notification-bell').click();
    cy.get('#novu-iframe-element')
      .its('0.contentDocument.body')
      .then((body) => {
        cy.wrap(body).find('[data-test-id="main-wrapper"]').should('be.visible');
      });
    cy.get('body').click();
    cy.get('#novu-iframe-element')
      .its('0.contentDocument.body')
      .then((body) => {
        cy.wrap(body).find('[data-test-id="main-wrapper"]').should('not.be.visible');
      });
  });

  it('should display unseen count outside', function () {
    cy.task('createNotifications', {
      identifier: this.session.templates[0].triggers[0].identifier,
      token: this.session.token,
      subscriberId: this.session.subscriber.subscriberId,
      count: 5,
      organizationId: this.session.organization._id,
    });
    cy.get('#notification-bell .ntf-counter').should('be.visible');
  });

  it('should display unseen count label in header', function () {
    cy.task('createNotifications', {
      identifier: this.session.templates[0].triggers[0].identifier,
      token: this.session.token,
      subscriberId: this.session.subscriber.subscriberId,
      count: 5,
      organizationId: this.session.organization._id,
    });

    cy.get('#notification-bell').click();
    cy.get('#novu-iframe-element')
      .its('0.contentDocument.body')
      .should('not.be.empty')
      .then((body) => {
        cy.wrap(body).find('[data-test-id="unseen-count-label"]').should('be.visible').contains('5');
        cy.wrap(body).find('.nc-notifications-list-item-unread').should('have.length', 5);
      });
  });

  it('should change unseen count label in header when message is read', function () {
    cy.intercept('*/widgets/notifications/unseen*').as('fetchUnseenCount');

    cy.task('createNotifications', {
      identifier: this.session.templates[0].triggers[0].identifier,
      token: this.session.token,
      subscriberId: this.session.subscriber.subscriberId,
      count: 5,
      organizationId: this.session.organization._id,
    });

    cy.get('#notification-bell').click();
    cy.get('#novu-iframe-element')
      .its('0.contentDocument.body')
      .should('not.be.empty')
      .then((body) => {
        cy.wrap(body).find('[data-test-id="notification-list-item"]').first().trigger('mouseover');
        cy.wrap(body)
          .find('[data-test-id="notification-list-item"]')
          .first()
          .find('[data-test-id="notification-dots-button"]')
          .click();
        cy.wrap(body)
          .find('[data-test-id="notification-list-item"]')
          .first()
          .find('[data-test-id="notification-mark-as-read"]')
          .click();
        cy.wait('@fetchUnseenCount');
      });

    cy.get('#novu-iframe-element')
      .its('0.contentDocument.body')
      .should('not.be.empty')
      .then((body) => {
        cy.wrap(body).find('[data-test-id="unseen-count-label"]').should('be.visible').contains('4');
        cy.wrap(body).find('.nc-notifications-list-item-unread').should('have.length', 4);
      });
  });

  it('should change unseen count label in header when all messages are read', function () {
    cy.intercept('*/widgets/notifications/unseen*').as('fetchUnseenCount');

    cy.task('createNotifications', {
      identifier: this.session.templates[0].triggers[0].identifier,
      token: this.session.token,
      subscriberId: this.session.subscriber.subscriberId,
      count: 5,
      organizationId: this.session.organization._id,
    });

    cy.get('#notification-bell').click();
    cy.get('#novu-iframe-element')
      .its('0.contentDocument.body')
      .should('not.be.empty')
      .then((body) => {
        cy.wrap(body).find('[data-test-id="notifications-header-mark-all-as-read"]').click();
        cy.wait('@fetchUnseenCount');
      });

    cy.get('#novu-iframe-element')
      .its('0.contentDocument.body')
      .should('not.be.empty')
      .then((body) => {
        cy.wrap(body).find('[data-test-id="unseen-count-label"]').eq(0);
      });
  });
});

describe('Shell Embed - Seen Read', function () {
  beforeEach(function () {
    cy.initializeSession(initializeSessionSettings, templateOverride).as('session');
    cy.wait(1000);
    cy.viewport(1280, 800);
  });

  it('should display 0 seen 5 unseen 0 read 5 unread', function () {
    cy.task('createNotifications', {
      identifier: this.session.templates[0].triggers[0].identifier,
      token: this.session.token,
      subscriberId: this.session.subscriber.subscriberId,
      count: 5,
      organizationId: this.session.organization._id,
      templateId: this.session.templates[0]._id,
    });

    cy.waitForNetworkIdle(500);

    cy.get('#notification-bell').click();

    getNotifications(0);

    clickOnTab('unseen');

    getNotifications(5);

    clickOnTab('read');

    getNotifications(0);

    clickOnTab('unread');

    getNotifications(5);
  });

  it('should display notification under seen after tab change', function () {
    cy.task('createNotifications', {
      templateId: this.session.templates[0]._id,
      identifier: this.session.templates[0].triggers[0].identifier,
      token: this.session.token,
      subscriberId: this.session.subscriber.subscriberId,
      count: 5,
      organizationId: this.session.organization._id,
    });
    cy.intercept('**/notifications/feed?page=0&seen=true').as('seen');
    cy.intercept('**/notifications/feed?page=0&seen=false').as('unseen');

    cy.get('#notification-bell').click();

    getNotifications(0);

    clickOnTab('unseen');

    cy.wait('@unseen');

    clickOnTab('seen');

    cy.wait('@seen');

    getNotifications(5);
  });

  it('should display notification as read after been clicked', function () {
    cy.task('createNotifications', {
      identifier: this.session.templates[0].triggers[0].identifier,
      token: this.session.token,
      subscriberId: this.session.subscriber.subscriberId,
      count: 5,
      organizationId: this.session.organization._id,
      templateId: this.session.templates[0]._id,
    });

    cy.get('#notification-bell').click();

    clickOnTab('unread');

    clickOnFirstNotification();

    getNotifications(4);

    clickOnTab('read');

    getNotifications(1);
  });
});

function clickOnTab(tab: string) {
  cy.get('#novu-iframe-element')
    .its('0.contentDocument.body')
    .should('not.be.empty')
    .then((body) => {
      cy.wrap(body).find(`[data-test-id="tab-${tab}"]`).first().click();
    });
}

function clickOnFirstNotification() {
  cy.get('#novu-iframe-element')
    .its('0.contentDocument.body')
    .should('not.be.empty')
    .then((body) => {
      cy.wrap(body).find('[data-test-id="notification-list-item"]').first().click();
    });
}

function getNotifications(length: number) {
  return cy
    .get('#novu-iframe-element')
    .its('0.contentDocument.body')
    .should('not.be.empty')
    .then((body) => {
      cy.wrap(body).find(`[data-test-id="notification-list-item"]`).should('have.length', length);
    });
}
const initializeSessionSettings = {
  shell: true,
  tabs: [
    { name: 'Seen', storeId: 'seen' },
    { name: 'Unseen', storeId: 'unseen' },
    { name: 'Read', storeId: 'read' },
    { name: 'Unread', storeId: 'unread' },
  ],
  stores: [
    { storeId: 'seen', query: { seen: true } },
    { storeId: 'unseen', query: { seen: false } },
    { storeId: 'read', query: { read: true } },
    { storeId: 'unread', query: { read: false } },
  ],
} as IInitializeSessionSettings;

const templateOverride = {
  steps: [
    {
      type: ChannelTypeEnum.IN_APP,
      content: 'Test content for <b>{{firstName}}</b>',
    },
  ],
};
