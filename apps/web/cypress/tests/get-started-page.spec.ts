interface ITabLinkInfo {
  label: string;
  type: 'button' | 'a';
  urlRegex: RegExp;
}

interface ITabTest {
  tabName: string;
  tabTitle: string;
  numTimelineSteps: number;
  linkSteps: ITabLinkInfo[];
}

const BASE_ROUTE = '/get-started';

const visitTabAndVerifyContent = ({ tabName, tabTitle, numTimelineSteps, linkSteps }: ITabTest) => {
  cy.visit(BASE_ROUTE);

  cy.contains(tabName).click();

  // Check that the clicked tab is now selected
  cy.get('button[role="tab"][aria-selected="true"]').contains(tabName).should('exist');

  // Validate tab content title
  cy.contains('h2', tabTitle).should('exist');

  // There is a docs link
  cy.contains('a', 'Learn about')
    .should('have.attr', 'href')
    .and('match', /docs.novu.co/);

  // Animation is present
  cy.get('canvas').should('exist');

  // Validate timeline steps count by ensuring there is a numbered pill for each step
  new Array(numTimelineSteps).fill(0).forEach((_, index) => {
    cy.contains('div', index + 1);
  });

  // validate various links, open them, and go back to the tab
  linkSteps.forEach(({ urlRegex, label, type }) => {
    cy.contains(type, label).should('be.visible').click();

    cy.url().should('match', urlRegex);

    cy.go('back');

    // FIXME: required until feature flag check is removed since we always end up back on `in-app` tab
    cy.contains(tabName).click();
  });
};

describe('GetStartedPage', () => {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  afterEach(() => {
    // Add any teardown code if needed
  });

  it('should have all tabs and default to in-app', () => {
    cy.visit(BASE_ROUTE);

    // check all tabs exist
    cy.contains('button[role="tab"]', 'In-app').should('exist');
    cy.contains('button[role="tab"]', 'Multi-channel').should('exist');
    cy.contains('button[role="tab"]', 'Digest').should('exist');
    cy.contains('button[role="tab"]', 'Delay').should('exist');
    cy.contains('button[role="tab"]', 'Translate').should('exist');

    // Check that In-app is defaulted and selected
    cy.get('button[role="tab"][aria-selected="true"]').contains('In-app').should('exist');
  });

  // FIXME: this will fail until we remove the conditional load based on feature-flag
  it.skip('should load the page with a specific tab selected when the appropriate URL search param is passed', () => {
    cy.visit(`${BASE_ROUTE}?tab=multi-channel`);

    // Check that In-app is defaulted and selected
    cy.get('button[role="tab"][aria-selected="true"]').contains('Multi-channel').should('exist');
  });

  it('should navigate to the In-app tab, and have the correct content', () => {
    visitTabAndVerifyContent({
      tabName: 'In-app',
      tabTitle: 'In-app notifications',
      numTimelineSteps: 4,
      linkSteps: [
        {
          label: 'Create In-app provider',
          type: 'a',
          urlRegex: new RegExp('/integrations/[A-Z0-9]+', 'i'),
        },
        /*         // {
        //   label: 'Customize',
        //   type: 'button',
        //   urlRegex: new RegExp('/workflows'),
        // },
        // {
        //   label: 'Test the trigger',
        //   type: 'button',
        //   urlRegex: new RegExp('/workflows'),
        // }, */
        {
          label: 'activity feed',
          type: 'a',
          urlRegex: new RegExp('/activities'),
        },
      ],
    });
  });

  it('should navigate to the Multi-channel tab, and have the correct content', () => {
    visitTabAndVerifyContent({
      tabName: 'Multi-channel',
      tabTitle: 'Multi-channel notifications',
      numTimelineSteps: 4,
      linkSteps: [
        {
          label: 'Integration store',
          type: 'a',
          urlRegex: new RegExp('/integrations/create'),
        },
        /*         // {
        //   label: 'Customize',
        //   type: 'button',
        //   urlRegex: new RegExp('/workflows'),
        // },
        // {
        //   label: 'Test the trigger',
        //   type: 'button',
        //   urlRegex: new RegExp('/workflows'),
        // }, */
        {
          label: 'activity feed',
          type: 'a',
          urlRegex: new RegExp('/activities'),
        },
      ],
    });
  });

  it('should navigate to the Digest tab, and have the correct content', () => {
    visitTabAndVerifyContent({
      tabName: 'Digest',
      tabTitle: 'Digest multiple events',
      numTimelineSteps: 5,
      linkSteps: [
        {
          label: 'Integration store',
          type: 'a',
          urlRegex: new RegExp('/integrations/create'),
        },
        /*         // {
        //   label: 'Customize',
        //   type: 'button',
        //   urlRegex: new RegExp('/workflows'),
        // },
        // {
        //   label: 'Customize digest node',
        //   type: 'button',
        //   urlRegex: new RegExp('/workflows'),
        // },
        // {
        //   label: 'Test the trigger',
        //   type: 'button',
        //   urlRegex: new RegExp('/workflows'),
        // }, */
        {
          label: 'activity feed',
          type: 'a',
          urlRegex: new RegExp('/activities'),
        },
      ],
    });
  });

  it('should navigate to the Delay tab, and have the correct content', () => {
    visitTabAndVerifyContent({
      tabName: 'Delay',
      tabTitle: 'Delay step execution',
      numTimelineSteps: 5,
      linkSteps: [
        {
          label: 'Integration store',
          type: 'a',
          urlRegex: new RegExp('/integrations/create'),
        },
        /*         // {
        //   label: 'Customize',
        //   type: 'button',
        //   urlRegex: new RegExp('/workflows'),
        // },
        // {
        //   label: 'Customize delay',
        //   type: 'button',
        //   urlRegex: new RegExp('/workflows'),
        // },
        // {
        //   label: 'Test the trigger',
        //   type: 'button',
        //   urlRegex: new RegExp('/workflows'),
        // }, */
        {
          label: 'activity feed',
          type: 'a',
          urlRegex: new RegExp('/activities'),
        },
      ],
    });
  });

  it('should navigate to the Translate tab, and have the correct content', () => {
    visitTabAndVerifyContent({
      tabName: 'Translate',
      tabTitle: 'Translate content',
      numTimelineSteps: 4,
      linkSteps: [
        {
          label: 'Integration store',
          type: 'a',
          urlRegex: new RegExp('/integrations/create'),
        },
        {
          label: 'Translations page',
          type: 'a',
          urlRegex: new RegExp('/translations'),
        },
      ],
    });
  });
});
