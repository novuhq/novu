type Channel = 'inApp' | 'email' | 'sms' | 'digest';

export function addAndEditChannel(channel: Channel) {
  clickWorkflow();

  dragAndDrop(channel);
  editChannel(channel);
}

export function dragAndDrop(channel: Channel, dropTestId = 'addNodeButton') {
  const dataTransfer = new DataTransfer();

  cy.wait(1000);
  cy.getByTestId(`dnd-${channel}Selector`).trigger('dragstart', { dataTransfer });
  cy.getByTestId(dropTestId).parent().trigger('drop', { dataTransfer });
}

export function editChannel(channel: Channel, last = false) {
  cy.clickWorkflowNode(`node-${channel}Selector`, last);
  cy.getByTestId('edit-template-channel').click();
}

export function goBack() {
  cy.getByTestId('go-back-button').click();
}

export function fillBasicNotificationDetails(title?: string) {
  cy.waitForNetworkIdle(100);
  cy.getByTestId('title')
    .type(title || 'Test Notification Title')
    .blur();
  cy.getByTestId('description').type('This is a test description for a test title').blur();
  cy.wait(100);
}

export function waitLoadEnv(beforeWait: () => void) {
  cy.intercept('GET', 'http://localhost:1336/v1/environments').as('environments');
  cy.intercept('GET', 'http://localhost:1336/v1/environments/me').as('environments-me');

  beforeWait();

  cy.wait(['@environments', '@environments-me']);
}

export function waitLoadTemplatePage(beforeWait = (): string[] | void => []) {
  cy.intercept('GET', 'http://localhost:1336/v1/environments').as('environments');
  cy.intercept('GET', 'http://localhost:1336/v1/environments/me').as('environments-me');
  cy.intercept('GET', 'http://localhost:1336/v1/notification-groups').as('notification-groups');
  cy.intercept('GET', 'http://localhost:1336/v1/changes/count').as('changes-count');
  cy.intercept('GET', 'http://localhost:1336/v1/integrations/active').as('active-integrations');
  cy.intercept('GET', 'http://localhost:1336/v1/users/me').as('me');

  const waits = beforeWait();

  cy.wait([
    '@environments',
    '@environments-me',
    '@notification-groups',
    '@changes-count',
    '@active-integrations',
    '@me',
    ...(Array.isArray(waits) ? waits : []),
  ]);
}

export function clickWorkflow() {
  cy.getByTestId('workflowButton').click();
  cy.wait(1000);
}

export function awaitGetContains(getSelector: string, contains: string) {
  return cy
    .waitUntil(
      () =>
        cy
          .get(getSelector)
          .contains(contains)
          .as('awaitedElement')
          .wait(1) // for some reason this is needed, otherwise next line returns `true` even if click() fails due to detached element in the next step
          .then(($el) => {
            return Cypress.dom.isAttached($el);
          }),
      { timeout: 5000, interval: 500 }
    )
    .get('@awaitedElement');
}
