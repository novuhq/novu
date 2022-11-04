import { NavMenu } from './NavMenu';
import { MemoryRouter as Router } from 'react-router-dom';
import { TestWrapper } from '../../testing';

describe('NavMenu', () => {
  it('should have active class when clicked menu item', () => {
    const activeClass = 'mantine-g10fyh';
    const notActiveClass = 'mantine-16w7c2e';
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
      <Router>
        <TestWrapper>
          <NavMenu menuItems={menuItems} />
        </TestWrapper>
      </Router>
    );

    cy.getByTestId(menuHomeItemSelector).should('have.class', activeClass);
    cy.get(`a.${notActiveClass}`).each(($elem) => {
      cy.wrap($elem).should('not.have.class', activeClass);
      cy.wrap($elem).click();
      cy.wrap($elem).should('have.class', activeClass);
    });
  });
});
