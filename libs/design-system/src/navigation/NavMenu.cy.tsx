import { NavMenu } from './NavMenu';
import { TestWrapper } from '../testing';

describe('NavMenu', () => {
  it('should have active class when clicked menu item', () => {
    const menuItems = [
      {
        icon: null,
        label: 'Home',
        link: '/',
        testId: 'menu-home',
        rightSide: null,
      },
      {
        icon: null,
        label: 'About',
        link: '/about',
        testId: 'menu-about',
        rightSide: null,
      },
      {
        icon: null,
        label: 'Contact',
        link: '/contact',
        testId: 'menu-contact',
        rightSide: null,
      },
    ];
    const menuHomeItemSelector = menuItems[0].testId;

    cy.mount(
      <TestWrapper>
        <NavMenu menuItems={menuItems} />
      </TestWrapper>
    );

    cy.getByTestId(menuHomeItemSelector).should('have.attr', 'aria-current', 'page');
    cy.get(`a:not([aria-current])`).each(($elem) => {
      cy.wrap($elem).should('not.have.attr', 'aria-current', 'page');
      cy.wrap($elem).click();
      cy.wrap($elem).should('have.attr', 'aria-current', 'page');
    });
  });
});
